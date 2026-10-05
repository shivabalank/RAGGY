"""Optional stand-alone Llama server (run this on a GPU machine).

    uvicorn llm_server:app --host 0.0.0.0 --port 8001

Exposes a minimal OpenAI-compatible endpoint:  POST /v1/chat/completions
Point the main backend at it with  LLM_PROVIDER=remote  and  LLM_REMOTE_URL=http://<this-machine>:8001/v1

Set LLM_SERVER_API_KEY to require "Authorization: Bearer <key>" (use the same value as LLM_REMOTE_API_KEY
in the main backend). It reuses the exact same Llama loading/generation code as the main backend.
"""
import os
import secrets
from typing import Dict, List, Optional

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel

from app.rag.generator import LLMError, LocalLlamaService

app = FastAPI(title="Raggy LLM server")
_llm = LocalLlamaService()
_KEY = os.getenv("LLM_SERVER_API_KEY")


class Msg(BaseModel):
    role: str
    content: str


class ChatReq(BaseModel):
    messages: List[Msg]
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None


def _auth(authorization: Optional[str] = Header(default=None)) -> None:
    if _KEY and not secrets.compare_digest(authorization or "", f"Bearer {_KEY}"):
        raise HTTPException(status_code=401, detail="Unauthorized")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/chat/completions", dependencies=[Depends(_auth)])
def chat(req: ChatReq):
    # NOTE: generation parameters come from this server's own .env (MAX_NEW_TOKENS, TEMPERATURE, TOP_P).
    try:
        text = _llm.generate([m.model_dump() for m in req.messages])
    except LLMError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return {"object": "chat.completion", "choices": [{"index": 0, "message": {"role": "assistant", "content": text}, "finish_reason": "stop"}]}
