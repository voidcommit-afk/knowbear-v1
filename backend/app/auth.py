from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
from app.config import get_settings

security = HTTPBearer()

def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=500, detail="Supabase not configured on server")
    return create_client(settings.supabase_url, settings.supabase_anon_key)

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify the Supabase JWT token."""
    supabase = get_supabase()
    token = credentials.credentials
    
    try:
        # Get the user from the session/token
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
