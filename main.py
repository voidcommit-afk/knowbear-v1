"""Root ASGI entrypoint so `uvicorn main:app` works from repo root."""

import os
import sys

# Ensure `api/` is on sys.path so its absolute imports (config, routers, etc.) resolve.
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "api"))

from api.main import app
