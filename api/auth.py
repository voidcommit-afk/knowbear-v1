from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings
from functools import lru_cache

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify the Supabase JWT token."""
    token = credentials.credentials
    
    try:
        # Dummy verification - accept any token for testing
        if not token:
            raise HTTPException(status_code=401, detail="No token provided")
        return {"user": "dummy", "token": token}  # Dummy user
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
