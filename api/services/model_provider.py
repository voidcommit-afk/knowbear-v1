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
            
            model_name = "gemini-2.0-flash"

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

        # 3. INTELLIGENT ROUTING (Groq)
        target_model = "llama-3.1-8b-instant" # Default for speed/simple tasks
        max_tokens = 1024
        
        # Mode/Task based routing
        mode = kwargs.get("mode", "").lower()
        
        # A. Deep Reasoning / Logic
        if mode == "deep_dive" or "deep" in task.lower() or "reasoning" in task.lower():
            target_model = "deepseek-r1-distill-llama-70b"
            max_tokens = 4096 # Reasoning models output more
            
        # B. Coding / Technical
        elif task == "coding" or mode == "technical_depth" or "code" in task.lower():
            target_model = "qwen-2.5-32b"
            max_tokens = 2048
            
        # C. Multilingual Support
        # Simple heuristic: if we detect non-ascii or specific flag
        elif kwargs.get("multilingual", False) or any(ord(c) > 127 for c in prompt[:100]):
             target_model = "moonshotai/kimi-k2-instruct-0905"
             max_tokens = 2048
             
        # D. Simple / Fast Modes (Explicit)
        elif mode in ["fast", "eli5", "eli10"]:
            target_model = "gpt-oss-20b"
            # Fallback to Llama 3.1 8b is handled by the general fallback chain if this fails, 
            # or we could implement a specific try/except here, but the global fallback is safer.
            
        # 4. EXECUTION
        if not self.groq_client:
             return await self._fallback_chain(prompt)

        is_pro = kwargs.get("is_pro", False) or kwargs.get("premium", False)
        if not is_pro and max_tokens > 1024:
             max_tokens = 1024 # Cap free tier unless critical

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
