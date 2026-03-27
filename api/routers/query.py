"""Query endpoints for generating explanations."""

import asyncio
import json

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from logging_config import logger
from services.cache import cache_get, cache_set
from services.ensemble import ensemble_generate
from services.inference import generate_stream_explanation
from utils import FREE_LEVELS, PREMIUM_LEVELS, sanitize_topic, topic_cache_key

router = APIRouter(tags=["query"])

ALL_LEVELS = FREE_LEVELS + PREMIUM_LEVELS


class QueryRequest(BaseModel):
    topic: str = Field(..., min_length=1, max_length=200)
    levels: list[str] = Field(default=ALL_LEVELS)
    mode: str = "ensemble"
    bypass_cache: bool = False
    temperature: float = 0.7
    regenerate: bool = False


class QueryResponse(BaseModel):
    topic: str
    explanations: dict[str, str]
    cached: bool = False


def _normalize_mode(mode: str) -> str:
    return mode if mode in {"fast", "ensemble"} else "fast"


@router.post("/query", response_model=QueryResponse)
async def query_topic(req: QueryRequest) -> QueryResponse:
    """Generate explanations for a topic."""
    req.mode = _normalize_mode(req.mode)

    try:
        topic = sanitize_topic(req.topic)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    levels = [level for level in req.levels if level in ALL_LEVELS]
    if not levels:
        levels = ["eli5"]

    explanations: dict[str, str] = {}
    uncached: list[str] = []

    if not req.bypass_cache:
        for level in levels:
            key = topic_cache_key(topic, level)
            cached = await cache_get(key)
            if cached:
                explanations[level] = cached.get("text", "")
            else:
                uncached.append(level)
    else:
        uncached = levels

    if not uncached and not req.bypass_cache:
        return QueryResponse(topic=topic, explanations=explanations, cached=True)

    logger.info("query_start_generation", topic=topic, levels=uncached, mode=req.mode)
    tasks = {level: ensemble_generate(topic, level, False, req.mode) for level in uncached}
    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    for level, result in zip(tasks.keys(), results):
        if isinstance(result, str):
            explanations[level] = result
            key = topic_cache_key(topic, level)
            await cache_set(key, {"text": result})
        else:
            error_msg = str(result) if result else "Unknown error"
            explanations[level] = f"Error generating {level}: {error_msg}"
            logger.error("query_generation_failed", level=level, error=error_msg)

    return QueryResponse(topic=topic, explanations=explanations, cached=False)


@router.post("/query/stream")
async def query_topic_stream(req: QueryRequest):
    """Stream explanations for a topic."""
    req.mode = _normalize_mode(req.mode)

    try:
        topic = sanitize_topic(req.topic)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e

    level = req.levels[0] if req.levels and req.levels[0] in ALL_LEVELS else "eli5"

    async def event_generator():
        full_content = ""
        buffer = ""
        last_flush_time = asyncio.get_event_loop().time()

        try:
            yield f"data: {json.dumps({'topic': topic, 'level': level})}\n\n"

            if not req.bypass_cache:
                cache_key = topic_cache_key(topic, level)
                cached = await cache_get(cache_key)
                if cached and cached.get("text"):
                    content = cached["text"]
                    chunk_size = 500
                    for i in range(0, len(content), chunk_size):
                        chunk = content[i : i + chunk_size]
                        yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                        await asyncio.sleep(0.01)
                    yield "data: [DONE]\n\n"
                    return

            token_count = 0
            chunk_count = 0
            avg_chunk_size = 0.0

            async for chunk in generate_stream_explanation(
                topic,
                level,
                mode=req.mode,
                is_pro=False,
                temperature=req.temperature,
                regenerate=req.regenerate,
            ):
                full_content += chunk
                chunk_count += 1
                avg_chunk_size = (avg_chunk_size * (chunk_count - 1) + len(chunk)) / chunk_count

                if "__TRUNCATED__" in chunk:
                    chunk = chunk.replace("__TRUNCATED__", "")
                    if chunk:
                        buffer += chunk
                        if buffer:
                            yield f"data: {json.dumps({'chunk': buffer})}\n\n"
                            buffer = ""
                    yield f"data: {json.dumps({'warning': 'Response may be incomplete due to length limits. Try regenerating.'})}\n\n"
                    break

                buffer += chunk
                token_count += len(chunk.split())
                current_time = asyncio.get_event_loop().time()
                dynamic_timeout = 0.15 if avg_chunk_size > 10 else 0.25

                should_flush = (
                    token_count < 10
                    or buffer.endswith("\n\n")
                    or len(buffer) > 50
                    or buffer.endswith(". ")
                    or buffer.endswith("! ")
                    or buffer.endswith("? ")
                    or buffer.endswith(".\n")
                    or buffer.endswith("!\n")
                    or buffer.endswith("?\n")
                    or buffer.endswith(": ")
                    or buffer.endswith(";\n")
                    or (current_time - last_flush_time) > dynamic_timeout
                )

                if should_flush and buffer:
                    yield f"data: {json.dumps({'chunk': buffer})}\n\n"
                    buffer = ""
                    last_flush_time = current_time

            if buffer:
                yield f"data: {json.dumps({'chunk': buffer})}\n\n"

            yield "data: [DONE]\n\n"

            if full_content.strip():
                cache_key = topic_cache_key(topic, level)
                await cache_set(cache_key, {"text": full_content})

        except Exception as e:
            logger.error("streaming_failed", error=str(e), topic=topic)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
