import hashlib
import random
import httpx
from typing import Dict, Any, List, Optional
from config import get_settings
from services.cache import cache_get, cache_set
from logging_config import logger

settings = get_settings()

class SearchManager:
    def __init__(self):
        self.visual_keywords = {"diagram", "flowchart", "image", "photo", "visual", "graph", "chart"}

    async def get_search_context(self, query: str) -> str:
        # Check cache
        try:
            cache_key = f"search:{hashlib.sha256(query.encode()).hexdigest()}"
            cached = await cache_get(cache_key)
            if cached and isinstance(cached, dict) and "content" in cached:
                logger.info("search_cache_hit", query=query)
                return cached["content"]
        except Exception as e:
            logger.warning("cache_error_search", error=str(e))

        # Determine provider
        provider = self._select_provider(query)
        logger.info("search_provider_selected", provider=provider, query=query)

        content = ""
        try:
            if provider == "tavily":
                content = await self._search_tavily(query)
            elif provider == "serper":
                content = await self._search_serper(query)
            elif provider == "exa":
                content = await self._search_exa(query)
        except Exception as e:
            logger.error("search_provider_failed", provider=provider, error=str(e))
            content = await self._fallback_search(query, failed_provider=provider)

        if not content and content is not None:
             # Try fallback if content is empty string (failure)
             content = await self._fallback_search(query, failed_provider=provider)

        # Cache result if valid
        if content:
            await cache_set(cache_key, {"content": content}, ttl=86400) # 24h default

        return content if content else "No external context found."

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

    async def _search_tavily(self, query: str) -> str:
        if not settings.tavily_api_key:
            raise ValueError("Tavily API key missing")
        
        payload = {
            "api_key": settings.tavily_api_key,
            "query": query,
            "search_depth": "basic",
            "include_answer": True,
            "max_results": 5
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post("https://api.tavily.com/search", json=payload)
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            formatted = "\n".join([f"- {r['title']}: {r['content']} ({r['url']})" for r in results])
            return f"Answer: {data.get('answer', '')}\nSources:\n{formatted}"

    async def _search_serper(self, query: str) -> str:
        if not settings.serper_api_key:
            raise ValueError("Serper API key missing")
        
        headers = {
            'X-API-KEY': settings.serper_api_key,
            'Content-Type': 'application/json'
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://google.serper.dev/search",
                headers=headers,
                json={"q": query}
            )
            resp.raise_for_status()
            data = resp.json()
            organic = data.get("organic", [])
            formatted = "\n".join([f"- {r.get('title')}: {r.get('snippet')} ({r.get('link')})" for r in organic[:5]])
            return formatted

    async def _search_exa(self, query: str) -> str:
        if not settings.exa_api_key:
             raise ValueError("Exa API key missing")
             
        headers = {
            "x-api-key": settings.exa_api_key,
            "Content-Type": "application/json"
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.exa.ai/search",
                headers=headers,
                json={"query": query, "numResults": 5, "contents": {"text": True}}
            )
            resp.raise_for_status()
            data = resp.json()
            results = data.get("results", [])
            formatted = "\n".join([f"- {r.get('title')}: {r.get('text', '')[:300]}... ({r.get('url')})" for r in results])
            return formatted

    async def _fallback_search(self, query: str, failed_provider: str) -> str:
        providers = ["tavily", "serper", "exa"]
        if failed_provider in providers:
            providers.remove(failed_provider)
        
        # Shuffle remaining
        random.shuffle(providers)
        
        for p in providers:
            try:
                if p == "tavily": return await self._search_tavily(query)
                if p == "serper": return await self._search_serper(query)
                if p == "exa": return await self._search_exa(query)
            except Exception as e:
                logger.warning(f"fallback_failed_{p}", error=str(e))
                continue
        return ""

    async def get_images(self, query: str) -> List[Dict[str, str]]:
        # Fallback to Serper Images if Unsplash key is missing or logic dictates
        # This implementation uses Serper for simplicity as Unsplash key was not provided
        if not settings.serper_api_key:
            return []
            
        headers = {
            'X-API-KEY': settings.serper_api_key,
            'Content-Type': 'application/json'
        }
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    "https://google.serper.dev/images",
                    headers=headers,
                    json={"q": query}
                )
                resp.raise_for_status()
                data = resp.json()
                images = data.get("images", [])
                return [{"url": img["imageUrl"], "title": img["title"]} for img in images[:3]]
        except Exception as e:
            logger.error("image_search_failed", error=str(e))
            return []

    async def get_quote(self) -> Optional[str]:
        # api.quotable.io
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get("https://api.quotable.io/random?tags=technology|science|wisdom")
                if resp.status_code == 200:
                    data = resp.json()
                    return f"> {data['content']} — {data['author']}"
        except:
            pass
        return None

search_service = SearchManager()
