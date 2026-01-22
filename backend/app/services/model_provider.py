"""Model provider abstraction."""

import os
import httpx
import google.generativeai as genai
from app.config import get_settings

class ModelError(Exception):
    """Base model error."""
    pass

class RequiresPro(ModelError):
    """Raised when a model requires pro/gated access."""
    pass

class ModelUnavailable(ModelError):
    """Raised when a model is not configured or fails."""
    pass

class ModelProvider:
    """Singleton for managing model clients."""

    _instance = None
    
    def __init__(self):
        self.settings = get_settings()
        self.gemini_configured = False
        self.gemma_token = None
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def initialize(self):
        """Startup initialization and validation."""
        # Initialize Gemini
        if self.settings.gemini_api_key:
            try:
                genai.configure(api_key=self.settings.gemini_api_key)
                self.gemini_configured = True
            except Exception as e:
                print(f"Gemini init failed: {e}")
        
        # Initialize Gemma (Kaggle)
        if self.settings.kaggle_api_token:
            self.gemma_token = self.settings.kaggle_api_token
            
    async def generate_text(self, model_type: str, prompt: str, **kwargs) -> str:
        """Complete text using specified model."""
        if model_type == "gemini":
            return await self._call_gemini(prompt, **kwargs)
        else:
            raise ModelError(f"Unknown model type: {model_type}")

    async def _call_gemini(self, prompt: str, **kwargs) -> str:
        if not self.gemini_configured:
            raise ModelUnavailable("Gemini is not configured.")
        
        # Enforce usage constraint example (real logic would check user tier)
        if not kwargs.get("is_pro", False):
             raise RequiresPro("Gemini requires pro access.")
             
        try:
            model = genai.GenerativeModel("gemini-1.5-flash") 
            response = await model.generate_content_async(prompt)
            return response.text
        except Exception as e:
            raise ModelError(f"Gemini generation failed: {str(e)}")

    async def _call_gemma(self, prompt: str, **kwargs) -> str:
        if not self.gemini_configured:
             raise ModelUnavailable("Gemini (fallback for Gemma) is not configured.")
             
        if not kwargs.get("is_pro", False):
             raise RequiresPro("Advanced models require pro access.")
             
        # Using Gemini 1.5 Flash as the 'Advanced' engine for now
        try:
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = await model.generate_content_async(
                f"You are the Advanced Knowledge Engine. Provide a deep, structured explanation: {prompt}"
            )
            return response.text
        except Exception as e:
            raise ModelError(f"Advanced Model generation failed: {str(e)}")
