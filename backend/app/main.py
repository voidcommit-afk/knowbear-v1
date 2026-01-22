"""FastAPI main application."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import pinned, query, export
from app.services.cache import close_redis
from app.services.inference import close_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """App lifespan: startup/shutdown."""
    from app.services.model_provider import ModelProvider
    
    # Initialize models
    provider = ModelProvider.get_instance()
    await provider.initialize()
    
    # Safe logging
    import sys
    print(f"Startup: Gemini {'Available' if provider.gemini_configured else 'Not Configured'}", file=sys.stderr)
    print(f"Startup: Gemma {'Available' if provider.gemma_token else 'Not Configured'}", file=sys.stderr)
    
    yield
    await asyncio.gather(close_redis(), close_client())


app = FastAPI(
    title="KnowBear API",
    description="AI-powered layered explanations",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    """Add security headers to all responses."""
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global error handler."""
    return JSONResponse(status_code=500, content={"error": "Internal server error"})


# Mount routers
app.include_router(pinned.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(export.router, prefix="/api")


@app.get("/health")
async def health():
    """Health check with dependency status."""
    status = {"status": "ok", "dependencies": {}}
    
    # Check Google Generative AI
    try:
        import google.generativeai as genai
        status["dependencies"]["google-generativeai"] = f"installed ({genai.__version__})"
    except ImportError:
        status["dependencies"]["google-generativeai"] = "missing"
    except Exception as e:
        status["dependencies"]["google-generativeai"] = f"error: {str(e)}"
        
    # Check FPDF
    try:
        import fpdf
        status["dependencies"]["fpdf2"] = f"installed ({fpdf.__version__})"
    except ImportError:
        status["dependencies"]["fpdf2"] = "missing"
    except Exception as e:
        status["dependencies"]["fpdf2"] = f"error: {str(e)}"

    return status
