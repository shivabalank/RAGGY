"""The remote LLM provider <-> llm_server.py contract, wired together without a GPU."""
import httpx
import pytest
from fastapi.testclient import TestClient

from app.config import get_settings
from app.rag.generator import LLMError, RemoteLlamaService

MSGS = [{"role": "system", "content": "s"}, {"role": "user", "content": "u"}]


def _server(monkeypatch, key):
    import llm_server
    monkeypatch.setattr(llm_server, "_KEY", key)
    monkeypatch.setattr(llm_server._llm, "generate", lambda m: f"echo:{m[-1]['content']}")
    return TestClient(llm_server.app)


def test_remote_provider_talks_to_llm_server(monkeypatch):
    srv = _server(monkeypatch, "secret")
    s = get_settings()
    monkeypatch.setattr(s, "llm_remote_url", "http://gpu:8001/v1")
    monkeypatch.setattr(s, "llm_remote_api_key", "secret")
    monkeypatch.setattr(httpx, "post", lambda url, json, headers, timeout: srv.post(url.replace("http://gpu:8001", ""), json=json, headers=headers))
    assert RemoteLlamaService().generate(MSGS) == "echo:u"


def test_llm_server_rejects_wrong_key(monkeypatch):
    srv = _server(monkeypatch, "secret")
    assert srv.post("/v1/chat/completions", json={"messages": MSGS}).status_code == 401
    assert srv.post("/v1/chat/completions", json={"messages": MSGS}, headers={"Authorization": "Bearer nope"}).status_code == 401


def test_remote_unreachable_gives_friendly_error(monkeypatch):
    s = get_settings()
    monkeypatch.setattr(s, "llm_remote_url", "http://127.0.0.1:9/v1")
    with pytest.raises(LLMError) as e:
        RemoteLlamaService().generate(MSGS)
    assert "unreachable" in str(e.value)


def test_chat_returns_503_with_clean_message_when_llm_down(client, pdf_bytes, monkeypatch):
    from app.rag import pipeline
    from tests.conftest import auth

    class Down:
        def generate(self, m):
            raise LLMError("The language model server is unreachable. Please try again later.")

    doc = client.post("/api/documents", headers=auth("alice"), files={"file": ("d.pdf", pdf_bytes)}).json()
    monkeypatch.setattr(pipeline, "get_llm_service", lambda: Down())
    r = client.post(f"/api/documents/{doc['id']}/chat", headers=auth("alice"), json={"question": "rooftop installations experiment"})
    assert r.status_code == 503 and "unreachable" in r.json()["detail"]
    # a failed answer must not leave a dangling half-saved turn in the history
    assert client.get(f"/api/documents/{doc['id']}/chat", headers=auth("alice")).json() == []
