"""Query endpoint for generating explanations."""

import asyncio
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from fastapi_limiter.depends import RateLimiter
from utils import sanitize_topic, topic_cache_key
from services.cache import cache_get, cache_set
from services.ensemble import ensemble_generate
from auth import verify_token_optional, get_supabase_admin, ensure_user_exists
from logging_config import logger

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
async def query_topic(
    req: QueryRequest,
    auth_data: dict = Depends(verify_token_optional)
) -> QueryResponse:
    """Generate explanations for a topic."""
    
    # Gating: Enforce Premium for 'ensemble'/'technical_depth', downgrading to 'fast' if needed (UX decision)
    if (req.mode == "ensemble" or req.mode == "technical_depth") and not req.premium:
        req.mode = "fast"  

    try:
        topic = sanitize_topic(req.topic)
    except ValueError as e:
        raise HTTPException(400, str(e))

    allowed_levels = FREE_LEVELS + (PREMIUM_LEVELS if req.premium else [])
    
    levels = [l for l in req.levels if l in allowed_levels]
    
    # If no valid levels remain (e.g. user requested only premium levels but is free), default to eli5
    if not levels:
        levels = ["eli5"]

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
        uncached = levels

    # If all levels are cached, we still want to record history if authenticated
    if not uncached and not req.bypass_cache:
        if auth_data:
            logger.info("query_cached_saving_history", user_id=auth_data["user"].id, topic=topic)
            asyncio.create_task(save_to_history(auth_data["user"], topic, levels))
        else:
            logger.info("query_cached_no_auth", topic=topic)
        return QueryResponse(topic=topic, explanations=explanations, cached=True)

    logger.info("query_start_generation", topic=topic, levels=uncached, has_auth=bool(auth_data))
    tasks = {lvl: ensemble_generate(topic, lvl, req.premium, req.mode) for lvl in uncached}
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    for lvl, result in zip(tasks.keys(), results):
        if isinstance(result, str):
            explanations[lvl] = result
            key = topic_cache_key(topic, lvl)
            await cache_set(key, {"text": result})
        else:
            explanations[lvl] = f"Error generating {lvl}"

    if auth_data:
        logger.info("query_success_saving_history", user_id=auth_data["user"].id, topic=topic)
        asyncio.create_task(save_to_history(auth_data["user"], topic, levels))
    else:
        logger.info("query_success_no_auth", topic=topic)

    return QueryResponse(topic=topic, explanations=explanations, cached=False)


async def save_to_history(user, topic: str, levels: list[str]):
    """Background task to save query to history. Deduplicates by topic per user."""
    logger.info("save_to_history_task_start", user_id=user.id, topic=topic)
    try:
        ensure_user_exists(user)
        supabase = get_supabase_admin()
        if not supabase:
            logger.error("save_to_history_task_no_supabase_admin")
            return

        # Check for existing entry for this user and topic
        existing = supabase.table("history").select("id, levels").eq("user_id", user.id).eq("topic", topic).execute()
        
        if existing.data:
            # Update existing entry
            item_id = existing.data[0]["id"]
            existing_levels = set(existing.data[0]["levels"])
            new_levels = list(existing_levels.union(set(levels)))
            
            supabase.table("history").update({
                "levels": new_levels,
                "created_at": "now()" # Move to top
            }).eq("id", item_id).execute()
            logger.info("save_to_history_task_updated", user_id=user.id, topic=topic)
        else:
            # Insert new entry
            response = supabase.table("history").insert({
                "user_id": user.id,
                "topic": topic,
                "levels": levels
            }).execute()
            logger.info("save_to_history_task_success", user_id=user.id, topic=topic, data=bool(response.data))
            
    except Exception as e:
        logger.error("save_to_history_task_error", error=str(e), user_id=user.id, topic=topic)

