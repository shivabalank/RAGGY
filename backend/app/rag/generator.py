"""LLM layer (notebook CELL 6 + 20), isolated behind a small interface.

    get_llm_service().generate(messages) -> str

The rest of the app never imports transformers or knows where the model runs. Providers:

* local   - loads meta-llama/Llama-2-7b-chat-hf in THIS process (needs an NVIDIA GPU; 4-bit by default).
* remote  - POSTs to any OpenAI-compatible /chat/completions server that serves Llama 2
            (backend/llm_server.py on a GPU box, vLLM, TGI, a Hugging Face Inference Endpoint ...).

Switching between them is a .env change (LLM_PROVIDER); no pipeline code changes.
"""
import logging
import threading
from abc import ABC, abstractmethod
from typing import Dict, List, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class LLMError(Exception):
    """Raised for any generation failure. Message is safe to show to users."""


class LLMService(ABC):
    @abstractmethod
    def generate(self, messages: List[Dict[str, str]]) -> str: ...

    def warmup(self) -> None:  # optional
        return None


class LocalLlamaService(LLMService):
    def __init__(self) -> None:
        self._tok = None
        self._model = None
        self._load_lock = threading.Lock()
        self._gen_lock = threading.Lock()  # one generation at a time on one GPU

    def _load(self) -> None:
        if self._model is not None:
            return
        with self._load_lock:
            if self._model is not None:
                return
            s = get_settings()
            try:
                import torch
            except ImportError as e:
                raise LLMError("PyTorch is not installed on the server.") from e
            if not torch.cuda.is_available():
                raise LLMError(
                    "The language model needs an NVIDIA GPU, but none was found on this machine. "
                    "Set LLM_PROVIDER=remote and point LLM_REMOTE_URL at a GPU server (see README)."
                )
            if not s.hf_token:
                raise LLMError("HF_TOKEN is not configured on the server.")
            try:
                from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

                logger.info("Loading %s (4-bit=%s) - first run downloads ~13 GB ...", s.llama_model_id, s.use_4bit)
                tok = AutoTokenizer.from_pretrained(s.llama_model_id, token=s.hf_token)
                if s.use_4bit:
                    bnb = BitsAndBytesConfig(
                        load_in_4bit=True, bnb_4bit_quant_type="nf4",
                        bnb_4bit_compute_dtype=torch.float16, bnb_4bit_use_double_quant=True,
                    )
                    model = AutoModelForCausalLM.from_pretrained(
                        s.llama_model_id, quantization_config=bnb, device_map="auto", token=s.hf_token)
                else:
                    model = AutoModelForCausalLM.from_pretrained(
                        s.llama_model_id, torch_dtype=torch.float16, device_map="auto", token=s.hf_token)
                model.eval()
            except Exception as e:
                logger.exception("Failed to load Llama model")
                if "out of memory" in str(e).lower() or type(e).__name__ == "OutOfMemoryError":
                    raise LLMError(
                        "This GPU does not have enough memory for Llama 2-7B (about 6 GB or more of free VRAM is "
                        "needed even in 4-bit). Set LLM_PROVIDER=remote and use a GPU server (see README)."
                    ) from e
                raise LLMError(
                    "The language model could not be loaded. Check HF_TOKEN and that your Hugging Face account "
                    "has been granted access to meta-llama/Llama-2-7b-chat-hf."
                ) from e
            self._tok, self._model = tok, model
            logger.info("Llama model ready.")

    def warmup(self) -> None:
        self._load()

    def generate(self, messages: List[Dict[str, str]]) -> str:
        import torch

        self._load()
        s = get_settings()
        try:
            inputs = self._tok.apply_chat_template(
                messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt"
            ).to(self._model.device)
            with self._gen_lock, torch.no_grad():
                outputs = self._model.generate(
                    **inputs, max_new_tokens=s.max_new_tokens, temperature=s.temperature, top_p=s.top_p,
                    do_sample=True, pad_token_id=self._tok.eos_token_id,
                )
            new_tokens = outputs[0][inputs["input_ids"].shape[-1]:]
            return self._tok.decode(new_tokens, skip_special_tokens=True).strip()
        except LLMError:
            raise
        except Exception as e:
            logger.exception("Llama generation failed")
            raise LLMError("The model failed to generate an answer. Please try again.") from e


class RemoteLlamaService(LLMService):
    """Talks to an OpenAI-compatible chat-completions endpoint that serves Llama 2."""

    def generate(self, messages: List[Dict[str, str]]) -> str:
        s = get_settings()
        if not s.llm_remote_url:
            raise LLMError("LLM_REMOTE_URL is not configured on the server.")
        headers = {"Content-Type": "application/json"}
        if s.llm_remote_api_key:
            headers["Authorization"] = f"Bearer {s.llm_remote_api_key}"
        body = {
            "model": s.llama_model_id, "messages": messages, "max_tokens": s.max_new_tokens,
            "temperature": s.temperature, "top_p": s.top_p,
        }
        url = s.llm_remote_url.rstrip("/") + "/chat/completions"
        try:
            r = httpx.post(url, json=body, headers=headers, timeout=httpx.Timeout(300.0, connect=15.0))
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"].strip()
        except httpx.HTTPStatusError as e:
            logger.error("LLM server returned %s: %s", e.response.status_code, e.response.text[:500])
            raise LLMError("The language model server returned an error. Please try again.") from e
        except (httpx.HTTPError, KeyError, IndexError, ValueError) as e:
            logger.error("LLM server call failed: %s", e)
            raise LLMError("The language model server is unreachable. Please try again later.") from e


_service: Optional[LLMService] = None
_service_lock = threading.Lock()


def get_llm_service() -> LLMService:
    global _service
    if _service is None:
        with _service_lock:
            if _service is None:
                provider = get_settings().llm_provider.lower()
                if provider == "remote":
                    _service = RemoteLlamaService()
                elif provider == "local":
                    _service = LocalLlamaService()
                else:
                    raise LLMError(f"Unknown LLM_PROVIDER '{provider}'. Use 'local' or 'remote'.")
    return _service
