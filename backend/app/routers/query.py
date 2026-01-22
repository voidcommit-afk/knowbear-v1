"""Query endpoint for generating explanations."""

import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.utils import sanitize_topic, topic_cache_key
from app.services.cache import cache_get, cache_set
from app.services.ensemble import ensemble_generate

router = APIRouter(tags=["query"])

FREE_LEVELS = ["eli5", "eli10", "eli12", "eli15", "meme"]
PREMIUM_LEVELS = ["technical", "systemic", "diagram"]


class QueryRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    levels: list[str] = Field(default=FREE_LEVELS)
    premium: bool = False
    mode: str = "ensemble"  # "fast" or "ensemble"


class QueryResponse(BaseModel):
    topic: str
    explanations: dict[str, str]
    cached: bool = False


from app.auth import verify_token
from fastapi import APIRouter, HTTPException, Depends
from fastapi_limiter.depends import RateLimiter

# ... (other imports)

@router.post("/query", response_model=QueryResponse, dependencies=[Depends(verify_token), Depends(RateLimiter(times=10, seconds=60))])
async def query_topic(req: QueryRequest) -> QueryResponse:
    """Generate explanations for a topic."""
    try:
        topic = sanitize_topic(req.topic)
    except ValueError as e:
        raise HTTPException(400, str(e))

    levels = [l for l in req.levels if l in (FREE_LEVELS + PREMIUM_LEVELS)]
    if not levels:
        levels = FREE_LEVELS

    # Check cache first
    explanations: dict[str, str] = {}
    uncached: list[str] = []
    for lvl in levels:
        key = topic_cache_key(topic, lvl)
        cached = await cache_get(key)
        if cached:
            explanations[lvl] = cached.get("text", "")
        else:
            uncached.append(lvl)

    if not uncached:
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
