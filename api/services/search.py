import asyncio
import hashlib
import random
import re
import time
import httpx
from config import get_settings
from logging_config import logger
from services.upstash_redis import get_upstash_redis_client

settings = get_settings()

class SearchManager:
    def __init__(self):
        self.visual_keywords = {"diagram", "flowchart", "image", "photo", "visual", "graph", "chart"}
        self.fast_timeout_seconds = 0.7
        self.ensemble_timeout_seconds = 1.8
        self.fast_cache_ttl_seconds = 300
        self.ensemble_cache_ttl_seconds = 900
        self._cache: dict[str, tuple[float, str]] = {}
        self._in_flight: dict[str, asyncio.Task[str]] = {}

    async def get_search_context(self, query: str, mode: str = "fast", retrieval: str | None = None) -> str:
        profile = "ensemble" if mode == "ensemble" else "fast"
        retrieval_policy = retrieval or ("required" if profile == "ensemble" else "auto")

        should_retrieve, reason = self._should_retrieve(query, retrieval_policy, profile)
        logger.info(
            "search_retrieval_decision",
            mode=profile,
            retrieval_policy=retrieval_policy,
            should_retrieve=should_retrieve,
            reason=reason,
            query=query,
        )
        if not should_retrieve:
            return "No external context found."

        cache_key = self._cache_key(query, profile)
        cached = await self._cache_get(cache_key, profile)
        if cached:
            logger.info("search_cache_hit", mode=profile, query=query)
            return cached

        timeout = self.fast_timeout_seconds if profile == "fast" else self.ensemble_timeout_seconds

        existing_task = self._in_flight.get(cache_key)
        if existing_task:
            try:
                content = await asyncio.wait_for(asyncio.shield(existing_task), timeout=timeout)
                await self._cache_set(cache_key, content, profile)
                return content if content else "No external context found."
            except Exception as e:
                logger.warning("search_inflight_wait_failed", mode=profile, error=str(e))
                return "No external context found."

        task = asyncio.create_task(self._retrieve_with_strategy(query, profile))
        self._in_flight[cache_key] = task

        started = time.perf_counter()
        try:
            content = await asyncio.wait_for(task, timeout=timeout)
        except Exception as e:
            logger.warning("search_timeout_or_failed", mode=profile, error=str(e), query=query)
            return "No external context found."
        finally:
            self._in_flight.pop(cache_key, None)

        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info("search_completed", mode=profile, latency_ms=elapsed_ms, used=bool(content), query=query)

        if content:
            await self._cache_set(cache_key, content, profile)

        return content if content else "No external context found."

    async def _retrieve_with_strategy(self, query: str, profile: str) -> str:
        provider = self._select_provider(query)
        logger.info("search_provider_selected", provider=provider, query=query, mode=profile)

        if profile == "fast":
            try:
                return await self._search_with_provider(provider, query, profile)
            except Exception as e:
                logger.warning("search_fast_provider_failed", provider=provider, error=str(e), query=query)
                return ""

        # Ensemble path: try primary and fallback providers concurrently.
        primary_task = asyncio.create_task(self._search_with_provider(provider, query, profile))
        fallback_task = asyncio.create_task(self._fallback_search(query, failed_provider=provider, profile=profile))
        tasks = [primary_task, fallback_task]
        try:
            for completed in asyncio.as_completed(tasks):
                try:
                    result = await completed
                    if result:
                        return result
                except Exception as e:
                    logger.warning("search_ensemble_provider_failed", error=str(e), query=query)
            return ""
        finally:
            for t in tasks:
                if not t.done():
                    t.cancel()

    async def _search_with_provider(self, provider: str, query: str, profile: str) -> str:
        if provider == "tavily":
            return await self._search_tavily(query, profile=profile)
        if provider == "serper":
            return await self._search_serper(query, profile=profile)
        if provider == "exa":
            return await self._search_exa(query, profile=profile)
        return ""

    def _cache_key(self, query: str, profile: str) -> str:
        normalized = re.sub(r"\s+", " ", query.strip().lower())
        digest = hashlib.sha256(normalized.encode()).hexdigest()
        return f"{profile}:{digest}"

    async def _cache_get(self, key: str, profile: str) -> str | None:
        hit = self._cache.get(key)
        if hit:
            expires_at, value = hit
            if expires_at > time.time():
                return value
            self._cache.pop(key, None)

        redis = get_upstash_redis_client()
        if redis.configured:
            remote = await redis.get(f"search_cache:{key}")
            if remote:
                ttl = self.fast_cache_ttl_seconds if profile == "fast" else self.ensemble_cache_ttl_seconds
                self._cache[key] = (time.time() + ttl, remote)
                return remote
        return None

    async def _cache_set(self, key: str, value: str, profile: str) -> None:
        ttl = self.fast_cache_ttl_seconds if profile == "fast" else self.ensemble_cache_ttl_seconds
        redis = get_upstash_redis_client()
        if redis.configured:
            await redis.setex(f"search_cache:{key}", ttl, value)
        self._cache[key] = (time.time() + ttl, value)

    def _should_retrieve(self, query: str, policy: str, profile: str) -> tuple[bool, str]:
        normalized_policy = policy.lower()
        if normalized_policy in {"off", "false", "none"}:
            return False, "policy_off"
        if normalized_policy in {"required", "on", "always", "true"}:
            return True, "policy_required"

        # Auto: only retrieve when likely to benefit.
        q = query.lower()
        if profile == "ensemble":
            return True, "ensemble_default"

        # Fast mode auto heuristics: trigger retrieval only for freshness/factual risk.
        retrieval_signals = [
            "latest",
            "today",
            "current",
            "price",
            "news",
            "update",
            "202",
            "who is",
            "when",
            "where",
            "compare",
            "vs",
            "regulation",
            "law",
            "statistics",
            "benchmark",
            "release",
        ]
        if any(token in q for token in retrieval_signals):
            return True, "auto_signal_match"

        # Very short/evergreen prompts are usually fine without retrieval in fast mode.
        if len(q.split()) <= 3:
            return False, "auto_short_evergreen"

        return False, "auto_default_skip"

    def _select_provider(self, query: str) -> str:
        # Check for visual keywords - favor Serper
        if any(keyword in query.lower() for keyword in self.visual_keywords):
            return "serper" if random.random() < 0.7 else self._weighted_random()
        
        return self._weighted_random()

    def _weighted_random(self) -> str:
        # Tavily 50%, Serper 30%, Exa 20%
        rand = random.random()
        if rand < 0.5:
            return "tavily"
        elif rand < 0.8:
            return "serper"
        else:
            return "exa"

    async def _search_tavily(self, query: str, profile: str = "fast") -> str:
        if not settings.tavily_api_key:
            raise ValueError("Tavily API key missing")
        max_results = 3 if profile == "fast" else 6
        
        payload = {
            "api_key": settings.tavily_api_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": True,
            "max_results": max_results
        }
        async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced from 10s to 5s
            resp = await client.post("https://api.tavily.com/search", json=payload)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            formatted = "\n".join([f"- {r['title']}: {r['content']} ({r['url']})" for r in results])
            return f"Answer: {data.get('answer', '')}\nSources:\n{formatted}"

    async def _search_serper(self, query: str, profile: str = "fast") -> str:
        if not settings.serper_api_key:
            raise ValueError("Serper API key missing")
        max_results = 3 if profile == "fast" else 6
        
        headers = {
            'X-API-KEY': settings.serper_api_key,
            'Content-Type': 'application/json'
        }
        async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced from 10s to 5s
            resp = await client.post(
                "https://google.serper.dev/search",
                headers=headers,
                json={"q": query}
            )
            resp.raise_for_status()
            data = resp.json()
            organic = data.get("organic", [])
            formatted = "\n".join([f"- {r.get('title')}: {r.get('snippet')} ({r.get('link')})" for r in organic[:max_results]])
            return formatted

    async def _search_exa(self, query: str, profile: str = "fast") -> str:
        if not settings.exa_api_key:
            raise ValueError("Exa API key missing")
        max_results = 3 if profile == "fast" else 6
        snippet_chars = 200 if profile == "fast" else 500
             
        headers = {
            "x-api-key": settings.exa_api_key,
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=5.0) as client:  # Reduced from 10s to 5s
            resp = await client.post(
                "https://api.exa.ai/search",
                headers=headers,
                json={"query": query, "numResults": max_results, "contents": {"text": True}}
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            formatted = "\n".join([f"- {r.get('title')}: {r.get('text', '')[:snippet_chars]}... ({r.get('url')})" for r in results])
            return formatted

    async def _fallback_search(self, query: str, failed_provider: str, profile: str = "fast") -> str:
        """Optimized parallel fallback with faster timeout."""
        import asyncio
        
        providers = ["tavily", "serper", "exa"]
        if failed_provider in providers:
            providers.remove(failed_provider)
        
        # Try all remaining providers in parallel for faster fallback
        tasks = []
        for p in providers:
            if p == "tavily":
                tasks.append(self._search_tavily(query, profile=profile))
            elif p == "serper":
                tasks.append(self._search_serper(query, profile=profile))
            elif p == "exa":
                tasks.append(self._search_exa(query, profile=profile))
        
        # Return first successful result
        for coro in asyncio.as_completed(tasks):
            try:
                result = await coro
                if result:  # Return first non-empty result
                    return result
            except Exception as e:
                logger.warning("fallback_provider_failed", error=str(e))
                continue
        
        return ""

    async def get_regeneration_quote(self) -> str:
        """Specialized quote fetching for regenerated answers with style variety."""
        tags = "education|knowledge|learning|science|wisdom|philosophy|technology|research|creativity|innovation|discovery|effort|critical-thinking"
        styles = [
            "---\n*“{content}”* — {author}",
            "---\nAs {author} said: *“{content}”*",
            "---\n*“{content}”*\n— {author}",
            "---\nIn the words of {author}: *“{content}”*",
            "---\nA thought worth keeping: *“{content}”* — {author}"
        ]
        
        fallback_quotes = [
            {"author": "Marie Curie", "content": "Nothing in life is to be feared, it is only to be understood. Now is the time to understand more."},
            {"author": "Richard Feynman", "content": "The first principle is that you must not fool yourself and you are the easiest person to fool."},
            {"author": "Leonardo da Vinci", "content": "Learning never exhausts the mind."},
            {"author": "Srinivasa Ramanujan", "content": "An equation for me has no meaning unless it expresses a thought of God."},
            {"author": "Ada Lovelace", "content": "That brain of mine is something more than merely mortal; as time will show."},
            {"author": "Hypatia", "content": "Reserve your right to think, for even to think wrongly is better than not to think at all."},
            {"author": "Nikola Tesla", "content": "The present is theirs; the future, for which I really worked, is mine."},
            {"author": "Rosalind Franklin", "content": "Science and everyday life cannot and should not be separated."},
            {"author": "Isaac Newton", "content": "If I have seen further it is by standing on the shoulders of Giants."},
            {"author": "Grace Hopper", "content": "The most dangerous phrase in the language is, 'We've always done it this way.'"}
        ]

        quote_data = None
        attempts = 0
        
        async with httpx.AsyncClient(timeout=4.0) as client:
            while attempts < 2:
                attempts += 1
                try:
                    # minLength=50, maxLength=120 as requested
                    resp = await client.get(f"https://api.quotable.io/random?tags={tags}&minLength=50&maxLength=120")
                    if resp.status_code == 200:
                        data = resp.json()
                        # Avoid overused authors if possible
                        overused = ["Albert Einstein", "Plutarch", "Marcus Aurelius", "Socrates", "Benjamin Franklin"]
                        if data["author"] in overused and attempts == 1:
                            continue # Try again once
                        quote_data = data
                        break
                except Exception:
                    break

        if not quote_data:
            quote_data = random.choice(fallback_quotes)

        style_idx = random.randrange(len(styles))
        
        formatted_quote = styles[style_idx].format(
            content=quote_data["content"].replace("«", "").replace("»", "").strip(), 
            author=quote_data["author"]
        )
        
        return formatted_quote

search_service = SearchManager()
