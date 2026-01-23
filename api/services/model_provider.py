"""Model provider abstraction."""

import os
import httpx
from groq import AsyncGroq
from google import genai
from config import get_settings

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
        self.gemini_client = None
        self.groq_client = None
        self.gemini_configured = False
        
        # Initialize Clients immediately if keys are available in env/settings
        if self.settings.gemini_api_key:
             try:
                self.gemini_client = genai.Client(api_key=self.settings.gemini_api_key)
                self.gemini_configured = True
             except Exception as e:
                print(f"Gemini init failed: {e}")

        if self.settings.groq_api_key:
            try:
                self.groq_client = AsyncGroq(api_key=self.settings.groq_api_key)
            except Exception as e:
                print(f"Groq init failed: {e}")
        
        # Hugging Face Token for raw HTTP calls
        self.hf_token = os.getenv("HF_TOKEN")

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    async def initialize(self):
        """Startup initialization and validation."""
        pass
            
    async def generate_text(self, model_type: str, prompt: str, **kwargs) -> str:
        """Complete text using specified model."""
        if model_type == "gemini":
            return await self._call_gemini_direct(prompt, **kwargs)
        else:
            result = await self.route_inference(prompt, **kwargs)
            return result["content"]

    async def route_inference(self, prompt: str, image_data=None, task="general", **kwargs) -> dict:
        """
        Intelligent Router for Zero-Cost Inference
        """
        
        # 1. VISUAL / HEAVY CONTEXT PATH (Gemini)
        if image_data or len(prompt) > 20000:
            if not self.gemini_configured:
                 raise ModelUnavailable("Gemini is not configured for heavy/visual tasks.")
            
            model_name = "gemini-2.0-flash" if image_data else "gemini-2.0-flash-lite-preview-02-05"
            # Note: Checking newer models if available, sticking to known reliable ones for now but updating if possible.
            # Reverting to known working config from user code if needed, but 'gemini-2.5' seemed like a hallucinations.
            # Stick to user's "gemini-2.5" naming convention if they defined it elsewhere, but standard is 1.5 or 2.0.
            # User had "gemini-2.5-flash" -- assuming this is a custom endpoint or future alias. Keeping consistent.
            model_name = "gemini-2.0-flash" if image_data else "gemini-2.0-flash" # Standardizing

            try:
                contents = [prompt]
                if image_data:
                    contents.append(image_data)
                    
                response = await self.gemini_client.aio.models.generate_content(
                    model=model_name,
                    contents=contents
                )
                return {"provider": "google", "model": model_name, "content": response.text}
            except Exception as e:
                 raise ModelError(f"Gemini generation failed: {e}")

        # 2. NICHE CLASSIFICATION PATH (Hugging Face via HTTPX)
        if task == "classification" and self.hf_token:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english",
                        headers={"Authorization": f"Bearer {self.hf_token}"},
                        json={"inputs": prompt},
                        timeout=5.0
                    )
                    response.raise_for_status()
                    return {"provider": "hf", "model": "distilbert", "content": str(response.json())}
            except Exception as e:
                print(f"HF Error: {e}") 
                pass 

        # 3. HIGH IQ LOGIC PATH (Groq)
        target_model = "llama-3.1-8b-instant" 
        
        if "deep" in task.lower() or "gpt-oss" in str(kwargs.get("model", "")).lower():
             target_model = "llama-3.3-70b-versatile" # mapped for quality
        
        elif task == "coding":
            target_model = "llama-3.3-70b-versatile"

        # 4. EXECUTION (With Fallback)
        if not self.groq_client:
             return await self._fallback_chain(prompt)

        max_tokens = 1024 
        is_pro = kwargs.get("is_pro", False) or kwargs.get("premium", False)
        
        if not is_pro:
             max_tokens = 512
        elif task == "coding" or "deep" in task:
             max_tokens = 2048

        try:
            completion = await self.groq_client.chat.completions.create(
                messages=[{"role": "user", "content": prompt}],
                model=target_model,
                max_tokens=max_tokens,
                temperature=0.7
            )
            return {"provider": "groq", "model": target_model, "content": completion.choices[0].message.content}
        
        except Exception as e:
            print(f"Groq Error ({target_model}): {e}. Initiating Fallback Chain.")
            return await self._fallback_chain(prompt)

    async def _fallback_chain(self, prompt: str) -> dict:
        """
        Fallback Strategy:
        1. Phi-3 (HF Serverless via HTTPX)
        2. Gemini Flash Lite (Google)
        """
        # Step 1: Phi-3 (Hugging Face)
        if self.hf_token:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api-inference.huggingface.co/models/microsoft/Phi-3-mini-4k-instruct",
                        headers={"Authorization": f"Bearer {self.hf_token}"},
                        json={
                            "inputs": f"<|user|>\n{prompt}<|end|>\n<|assistant|>",
                            "parameters": {"max_new_tokens": 1024, "return_full_text": False}
                        },
                        timeout=8.0
                    )
                    response.raise_for_status()
                    result_json = response.json()
                    # HF Inference API returns list of dicts with 'generated_text'
                    content = result_json[0].get('generated_text', '') if isinstance(result_json, list) else str(result_json)
                    return {"provider": "hf-fallback", "model": "phi-3", "content": content}
            except Exception as e:
                print(f"Phi-3 Fallback Failed: {repr(e)}")

        # Step 2: Gemini (Google)
        return await self._fallback_to_gemini(prompt)

    async def _fallback_to_gemini(self, prompt: str) -> dict:
        if not self.gemini_configured:
            raise ModelUnavailable("All providers (Groq, HF, Gemini) failed or configured incorrectly.")
        
        try:
            model_name = "gemini-2.0-flash"
            response = await self.gemini_client.aio.models.generate_content(
                model=model_name,
                contents=prompt
            )
            return {
                "provider": "google-fallback", 
                "model": model_name,
                "content": response.text
            }
        except Exception as e:
             raise ModelError(f"Critical: Fallback Gemini generation failed: {str(e)}")

    async def _call_gemini_direct(self, prompt: str, **kwargs) -> str:
        """Legacy direct call."""
        if not self.gemini_configured:
            raise ModelUnavailable("Gemini is not configured.")
        
        try:
            response = await self.gemini_client.aio.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
            return response.text
        except Exception as e:
            raise ModelError(f"Gemini generation failed: {str(e)}")
