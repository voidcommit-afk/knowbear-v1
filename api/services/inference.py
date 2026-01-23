"""Groq inference service."""

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from config import get_settings
from prompts import PROMPTS
from logging_config import logger

# Global client removed as we use ModelProvider now
# GROQ_URL removed

async def close_client():
    """No-op as ModelProvider manages its own clients."""
    pass


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((httpx.ConnectError, httpx.TimeoutException, httpx.HTTPStatusError)),
    reraise=True
)
async def call_model(model: str, prompt: str, max_tokens: int = 1024, **kwargs) -> str:
    """Call API with given model and prompt."""
    from services.model_provider import ModelProvider
    
    provider = ModelProvider.get_instance()
    
    # Determine task type based on model or content if not explicitly passed
    task = kwargs.get("task", "general")
    if model in ["llama-3.3-70b-versatile", "deep_dive"]:
         task = "coding"
            
    # Delegate to the intelligent router
    try:
        result = await provider.route_inference(
            prompt=prompt, 
            task=task,
            **kwargs
        )
        return result["content"]
    except Exception as e:
         logger.error("inference_failed", error=str(e), model=model)
         raise e



async def generate_explanation(topic: str, level: str, model: str, **kwargs) -> str:
    """Generate explanation for topic at given level."""
    template = PROMPTS.get(level)
    if not template:
        raise ValueError(f"Unknown level: {level}")
    prompt = template.format(topic=topic)
    return await call_model(model, prompt, **kwargs)
