"""Ensemble voting and judging logic."""

import asyncio
import json
import re
from prompts import JUDGE_PROMPT, JUDGE_MODEL, ENSEMBLE_MODELS, FAST_MODEL
from services.inference import call_model, generate_explanation


async def ensemble_generate(
    topic: str,
    level: str,
    mode: str = "ensemble",
    retrieval: str | None = None,
    client_ip: str = "unknown",
) -> str:
    """Generate with multiple models, pick best via judge."""
    if mode == "fast":
        # Fast mode: single model, no judge
        try:
            return await generate_explanation(
                topic,
                level,
                FAST_MODEL,
                is_pro=False,
                mode="fast",
                retrieval=retrieval,
                client_ip=client_ip,
            )
        except Exception as e:
            raise RuntimeError(f"Fast model failed: {e}")

    models = ENSEMBLE_MODELS
    tasks = [
        generate_explanation(
            topic,
            level,
            m,
            is_pro=False,
            mode="ensemble",
            retrieval=retrieval,
            client_ip=client_ip,
        )
        for m in models
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    valid = [(i, r) for i, r in enumerate(results) if isinstance(r, str) and r]
    if not valid:
        errors = [str(r) for r in results]
        raise RuntimeError(f"All models failed. Errors: {errors}")
    if len(valid) == 1:
        return valid[0][1]
    return await judge_responses(topic, [r for _, r in valid], client_ip=client_ip)


async def judge_responses(topic: str, responses: list[str], client_ip: str = "unknown") -> str:
    """Use judge model to pick best response."""
    # Give judge more context - 1500 chars from each response
    resp_text = "\n".join(f"[{i}]: {r[:1500]}" for i, r in enumerate(responses))
    prompt = JUDGE_PROMPT.format(topic=topic, responses=resp_text)
    try:
        result = await call_model(JUDGE_MODEL, prompt, max_tokens=256, client_ip=client_ip)
        # Gemini can wrap JSON in markdown fences; normalize before parsing.
        cleaned = result.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            parsed = json.loads(cleaned)
            idx = int(parsed.get("best", 0))
        except Exception:
            # Regex fallback if model returns non-strict JSON.
            match = re.search(r'"best"\s*:\s*(\d+)', result)
            idx = int(match.group(1)) if match else 0
        return responses[min(idx, len(responses) - 1)]
    except Exception:
        return responses[0]


async def generate_all_levels(topic: str, levels: list[str]) -> dict[str, str]:
    """Generate explanations for all levels in parallel."""
    tasks = {lvl: ensemble_generate(topic, lvl) for lvl in levels}
    results = {}
    for lvl, task in tasks.items():
        try:
            results[lvl] = await task
        except Exception as e:
            results[lvl] = f"Error: {str(e)}"
    return results
