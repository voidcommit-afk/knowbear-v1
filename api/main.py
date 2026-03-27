"""FastAPI main application."""

import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime

import structlog
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import get_settings
from logging_config import logger, setup_logging
from rate_limit import enforce_ip_rate_limit
from routers import export, pinned, query
from services.cache import close_redis, get_redis
from services.inference import close_client
from services.model_provider import ModelError, ModelProvider, ModelUnavailable


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App lifespan: startup/shutdown."""
    setup_logging()

    try:
        r = await get_redis()
        await r.ping()
        logger.info("redis_connected")
    except Exception as e:
        logger.warning("redis_unavailable_continuing", error=str(e))

    provider = ModelProvider.get_instance()
    await provider.initialize()
    logger.info("startup", gemini_configured=provider.gemini_configured)

    yield
    await asyncio.gather(close_redis(), close_client(), ModelProvider.get_instance().close())


app = FastAPI(
    title="KnowBear API",
    description="AI-powered layered explanations",
    version="1.0.0",
    lifespan=lifespan,
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "DELETE"],
    allow_headers=["content-type", "x-forwarded-for"],
    max_age=3600,
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' blob: data: https://*.googleusercontent.com; "
        "connect-src 'self' https://*.groq.com https://api.groq.com; "
        "font-src 'self' data:; "
        "object-src 'none'; "
        "base-uri 'self'; "
        "form-action 'self'; "
        "frame-ancestors 'none';"
    )

    response.headers["Content-Security-Policy"] = csp
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "0"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"

    return response


@app.middleware("http")
async def structlog_middleware(request: Request, call_next):
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        path=request.url.path,
        method=request.method,
        client_ip=request.client.host if request.client else None,
    )

    try:
        response = await call_next(request)
        structlog.contextvars.bind_contextvars(status_code=response.status_code)
        if response.status_code >= 400:
            logger.warning("http_request_failed")
        else:
            logger.info("http_request_success")
        return response
    except Exception as e:
        logger.error("http_request_exception", error=str(e))
        raise


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("global_exception", error=str(exc))
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


@app.exception_handler(ModelUnavailable)
async def model_unavailable_handler(request: Request, exc: ModelUnavailable):
    logger.warning("model_unavailable", error=str(exc))
    return JSONResponse(status_code=503, content={"error": "Service Unavailable", "detail": str(exc)})


@app.exception_handler(ModelError)
async def model_error_handler(request: Request, exc: ModelError):
    logger.error("model_error", error=str(exc))
    return JSONResponse(status_code=400, content={"error": "Bad Request", "detail": str(exc)})


app.include_router(pinned.router, prefix="/api")
app.include_router(query.router, prefix="/api", dependencies=[Depends(enforce_ip_rate_limit)])
app.include_router(export.router, prefix="/api")


@app.get("/api/health", tags=["health"])
async def health():
    settings = get_settings()
    status = {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.environment,
    }

    try:
        r = await get_redis()
        await r.ping()
        status["redis"] = "healthy"
    except Exception as e:
        status["redis"] = f"unavailable: {str(e)}"

    try:
        from google import genai  # noqa: F401

        status["google_genai"] = "installed"
    except Exception as e:
        status["google_genai"] = f"missing: {str(e)}"

    return status


@app.get("/{path:path}")
async def catch_all(path: str):
    return {"message": f"Catch-all route hit: /{path}", "status": "Backend is running!"}
