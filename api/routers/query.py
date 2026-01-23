"""Query endpoint for generating explanations."""

import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from fastapi_limiter.depends import RateLimiter
from utils import sanitize_topic, topic_cache_key
from services.cache import cache_get, cache_set
from services.ensemble import ensemble_generate
from auth import verify_token

router = APIRouter(tags=["query"])

FREE_LEVELS = ["eli5", "eli10", "eli12", "eli15", "meme"]
PREMIUM_LEVELS = ["technical", "systemic", "diagram", "classic60", "gentle70", "warm80"]


class QueryRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    levels: list[str] = Field(default=FREE_LEVELS)
    premium: bool = False
    mode: str = "ensemble"  # "fast", "ensemble", "deep_dive", "technical_depth"
    bypass_cache: bool = False


class QueryResponse(BaseModel):
    topic: str
    explanations: dict[str, str]
    cached: bool = False


@router.post("/query", response_model=QueryResponse)
async def query_topic(req: QueryRequest) -> QueryResponse:
    """Generate explanations for a topic."""
    
    # Gating Logic: Enforce Premium for 'ensemble' mode
    # Gating Logic: Enforce Premium for 'ensemble' and 'technical_depth' mode
    if (req.mode == "ensemble" or req.mode == "technical_depth") and not req.premium:
        # Soft enforcement (UX decision): Downgrade to 'fast'
        req.mode = "fast"  

    try:
        topic = sanitize_topic(req.topic)
    except ValueError as e:
        raise HTTPException(400, str(e))

    # Gating Logic: Filter levels based on premium status
    allowed_levels = FREE_LEVELS + (PREMIUM_LEVELS if req.premium else [])
    
    # Filter requested levels against allowed
    levels = [l for l in req.levels if l in allowed_levels]
    
    # If no valid levels remain (e.g. user requested only premium levels but is free), default to eli5
    if not levels:
        levels = ["eli5"]

    # Check cache first (unless bypassed)
    explanations: dict[str, str] = {}
    uncached: list[str] = []
    
    if not req.bypass_cache:
        for lvl in levels:
            key = topic_cache_key(topic, lvl)
            cached = await cache_get(key)
            if cached:
                explanations[lvl] = cached.get("text", "")
            else:
                uncached.append(lvl)
    else:
        # If bypassing cache, treat all levels as uncached
        uncached = levels

    if not uncached and not req.bypass_cache:
        return QueryResponse(topic=topic, explanations=explanations, cached=True)

    # Generate missing levels in parallel
    tasks = {lvl: ensemble_generate(topic, lvl, req.premium, req.mode) for lvl in uncached}
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    for lvl, result in zip(tasks.keys(), results):
        if isinstance(result, str):
            explanations[lvl] = result
            key = topic_cache_key(topic, lvl)
            await cache_set(key, {"text": result})
        else:
            explanations[lvl] = f"Error generating {lvl}"

    return QueryResponse(topic=topic, explanations=explanations, cached=False)
