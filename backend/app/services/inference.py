"""Groq inference service."""

import httpx
from app.config import get_settings
from app.prompts import PROMPTS

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


async def call_model(model: str, prompt: str, max_tokens: int = 1024) -> str:
    """Call Groq API with given model and prompt."""
    settings = get_settings()
    headers = {
        "Authorization": f"Bearer {settings.groq_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.7,
    }
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(GROQ_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()


async def generate_explanation(topic: str, level: str, model: str) -> str:
    """Generate explanation for topic at given level."""
    template = PROMPTS.get(level)
    if not template:
        raise ValueError(f"Unknown level: {level}")
    prompt = template.format(topic=topic)
    return await call_model(model, prompt)
