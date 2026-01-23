"""Groq inference service."""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from config import get_settings
from prompts import PROMPTS
from logging_config import logger

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Global client for connection pooling
_client = httpx.AsyncClient(timeout=30.0)


async def close_client():
    await _client.aclose()


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError)),
    reraise=True
)
async def call_model(model: str, prompt: str, max_tokens: int = 1024, **kwargs) -> str:
    """Call API with given model and prompt."""
    
    # Check for new models first
    if model in ["gemini", "gemma"]:
        from services.model_provider import ModelProvider
        try:
            provider = ModelProvider.get_instance()
            return await provider.generate_text(model, prompt, **kwargs)
        except Exception as e:
             raise e
        
    # Fallback to Groq for everything else
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
    
    try:
        resp = await _client.post(GROQ_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except httpx.HTTPError as e:
        logger.error("groq_api_error", error=str(e), model=model)
        raise


async def generate_explanation(topic: str, level: str, model: str, **kwargs) -> str:
    """Generate explanation for topic at given level."""
    template = PROMPTS.get(level)
    if not template:
        raise ValueError(f"Unknown level: {level}")
    prompt = template.format(topic=topic)
    return await call_model(model, prompt, **kwargs)
