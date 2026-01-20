"""Configuration and environment variables."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    groq_api_key: str = ""
    redis_url: str = "redis://localhost:6379"
    cache_ttl: int = 86400  # 24 hours

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
