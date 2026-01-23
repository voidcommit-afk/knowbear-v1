from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings
from supabase import create_client, Client
from supabase_auth.errors import AuthApiError

security = HTTPBearer()

def get_supabase() -> Client:
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        # Fallback for build/test environments where keys might be missing
        print("Warning: Supabase credentials missing during init")
        return None
    return create_client(settings.supabase_url, settings.supabase_anon_key)

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """Verify the Supabase JWT token."""
    token = credentials.credentials
    supabase = get_supabase()
    
    if not supabase:
         # Fail open or closed? For security, fail closed, but let's check if it's a dev env issue.
         # Actually, without credentials, we can't verify.
         raise HTTPException(status_code=500, detail="Server configuration error: Auth unavailable")

    try:
        # Verify token by getting the user
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid token")
            
        return {"user": user_response.user, "token": token}
        
    except AuthApiError as e:
        print(f"Auth API Error: {e}")
        raise HTTPException(status_code=401, detail=f"Authentication failed: {e.message}")
    except Exception as e:
        print(f"Auth Validation Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
