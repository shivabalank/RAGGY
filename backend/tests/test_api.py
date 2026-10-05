import pytest

from app.rag import vector_store
from tests.conftest import auth


def upload(client, user, name, data, ctype="application/octet-stream"):
    return client.post("/api/documents", headers=auth(user), files={"file": (name, data, ctype)})


# ---------------------------------------------------------------- authentication
def test_health_is_public(client):
    assert client.get("/api/health").json()["status"] == "ok"


@pytest.mark.parametrize("headers", [{}, {"Authorization": "Bearer nonsense"}, {"Authorization": "Basic abc"}])
def test_protected_routes_reject_missing_or_bad_token(client, headers):
    assert client.get("/api/documents", headers=headers).status_code == 401
    assert client.post("/api/documents/x/chat", json={"question": "hi"}, headers=headers).status_code == 401


# ---------------------------------------------------------------- upload + processing
def test_pdf_upload_process_list_details(client, pdf_bytes):
    r = upload(client, "alice", "research.pdf", pdf_bytes)
    assert r.status_code == 201
    doc = r.json()
    assert doc["name"] == "research.pdf" and doc["type"] == "pdf" and doc["size"] == len(pdf_bytes)
    # FastAPI background tasks have finished by the time the TestClient returns
    d = client.get(f"/api/documents/{doc['id']}", headers=auth("alice")).json()
    assert d["status"] == "ready" and d["pages"] == 2
    assert doc["id"] in [x["id"] for x in client.get("/api/documents", headers=auth("alice")).json()]


def test_docx_upload_ready_and_no_fake_page_numbers(client, docx_bytes):
    doc = upload(client, "alice", "report.docx", docx_bytes).json()
    d = client.get(f"/api/documents/{doc['id']}", headers=auth("alice")).json()
    assert d["status"] == "ready" and d["pages"] is None
    msg = client.post(f"/api/documents/{doc['id']}/chat", headers=auth("alice"),
                      json={"question": "How were the customer interviews conducted?"}).json()
    assert msg["sources"], "expected sources"
    assert all(s["page"] is None for s in msg["sources"])
    assert any(s["section"] == "Methodology" for s in msg["sources"])


def test_invalid_files_rejected(client, pdf_bytes):
    assert upload(client, "alice", "notes.txt", b"hello").status_code == 400
    assert upload(client, "alice", "fake.pdf", b"this is not a pdf").status_code == 400
    assert upload(client, "alice", "fake.docx", b"%PDF-1.4 pretend").status_code == 400
    assert upload(client, "alice", "empty.pdf", b"").status_code == 400
    from app.config import get_settings
    s = get_settings()
    old, s.max_file_mb = s.max_file_mb, 0
    try:
        assert upload(client, "alice", "big.pdf", pdf_bytes).status_code == 413
    finally:
        s.max_file_mb = old


def test_corrupt_pdf_marked_failed_with_friendly_message(client):
    doc = upload(client, "alice", "broken.pdf", b"%PDF-1.4 garbage garbage").json()
    d = client.get(f"/api/documents/{doc['id']}", headers=auth("alice")).json()
    assert d["status"] == "failed" and d["error"]
    assert "Traceback" not in d["error"]


# ---------------------------------------------------------------- RAG behaviour
def test_pdf_chat_sources_history_and_unanswerable(client, pdf_bytes):
    doc = upload(client, "alice", "paper.pdf", pdf_bytes).json()
    url = f"/api/documents/{doc['id']}/chat"
    m = client.post(url, headers=auth("alice"), json={"question": "What experiment was used with rooftop installations?"}).json()
    assert m["role"] == "assistant" and m["sources"]
    assert m["sources"][0]["page"] == 2 and m["sources"][0]["documentName"] == "paper.pdf"
    # unrelated question -> grounded refusal, no sources
    n = client.post(url, headers=auth("alice"), json={"question": "Describe penguin migration habits"}).json()
    assert n["content"] == "I could not find this information in the provided documents." and n["sources"] == []
    # history persists, in order, with sources
    h = client.get(url, headers=auth("alice")).json()
    assert [x["role"] for x in h] == ["user", "assistant", "user", "assistant"]
    assert h[1]["sources"] == m["sources"]
    # clearing works
    assert client.delete(url, headers=auth("alice")).status_code == 204
    assert client.get(url, headers=auth("alice")).json() == []


def test_spec_style_chat_endpoint(client, pdf_bytes):
    doc = upload(client, "alice", "spec.pdf", pdf_bytes).json()
    r = client.post("/api/chat", headers=auth("alice"),
                    json={"document_id": doc["id"], "question": "What did the introduction study?", "conversation_history": []})
    assert r.status_code == 200 and r.json()["answer"] and "sources" in r.json()
    assert client.get(f"/api/chat/{doc['id']}/history", headers=auth("alice")).status_code == 200


# ---------------------------------------------------------------- USER DATA ISOLATION
def test_user_b_cannot_touch_user_a_documents(client, pdf_bytes):
    doc = upload(client, "alice", "private-alice.pdf", pdf_bytes).json()
    did = doc["id"]
    client.post(f"/api/documents/{did}/chat", headers=auth("alice"), json={"question": "rooftop installations experiment"})

    b = auth("bob")
    assert did not in [x["id"] for x in client.get("/api/documents", headers=b).json()]
    assert client.get(f"/api/documents/{did}", headers=b).status_code == 404
    assert client.get(f"/api/documents/{did}/download", headers=b).status_code == 404
    assert client.delete(f"/api/documents/{did}", headers=b).status_code == 404
    assert client.post(f"/api/documents/{did}/chat", headers=b, json={"question": "rooftop installations"}).status_code == 404
    assert client.get(f"/api/documents/{did}/chat", headers=b).status_code == 404
    assert client.delete(f"/api/documents/{did}/chat", headers=b).status_code == 404
    assert client.post("/api/chat", headers=b, json={"document_id": did, "question": "rooftop"}).status_code == 404
    assert client.get(f"/api/chat/{did}/history", headers=b).status_code == 404
    # unknown id looks identical to someone else's id (no information leak)
    assert client.get("/api/documents/does-not-exist", headers=b).json() == client.get(f"/api/documents/{did}", headers=b).json()

    # Alice's data is untouched
    assert client.get(f"/api/documents/{did}", headers=auth("alice")).status_code == 200
    assert client.get(f"/api/documents/{did}/download", headers=auth("alice")).content == pdf_bytes
    assert len(client.get(f"/api/documents/{did}/chat", headers=auth("alice")).json()) == 2


def test_vector_search_is_scoped_to_user_and_document(client, pdf_bytes):
    from app.rag.embeddings import embed_query
    a = upload(client, "alice", "same.pdf", pdf_bytes).json()
    b = upload(client, "bob", "same.pdf", pdf_bytes).json()  # identical content, different owner
    from app.models.user import User
    from app.services.database import session_scope
    with session_scope() as db:
        ua = db.query(User).filter_by(firebase_uid="uid-alice").one()
        ub = db.query(User).filter_by(firebase_uid="uid-bob").one()
        q = embed_query("rooftop installations experiment")
        for user, doc in ((ua, a), (ub, b)):
            hits = vector_store.search(q, user.id, doc["id"], limit=50)
            assert hits
        assert vector_store.search(q, ub.id, a["id"], limit=50) == []   # Bob + Alice's doc -> nothing
        assert vector_store.search(q, ua.id, b["id"], limit=50) == []   # Alice + Bob's doc -> nothing


def test_storage_keys_are_per_user(client, pdf_bytes):
    from app.services.storage import StorageError, assert_key_owned
    doc = upload(client, "alice", "../../evil/..\\name.pdf", pdf_bytes).json()
    from app.models.document import Document
    from app.services.database import session_scope
    with session_scope() as db:
        key = db.get(Document, doc["id"]).s3_key
    assert key.startswith("users/uid-alice/documents/") and ".." not in key
    assert_key_owned(key, "uid-alice")
    with pytest.raises(StorageError):
        assert_key_owned(key, "uid-bob")


# ---------------------------------------------------------------- delete
def test_delete_removes_file_vectors_chat_and_row(client, pdf_bytes):
    from app.models.chat import ChatSession, Message
    from app.models.document import Document
    from app.models.user import User
    from app.services.database import session_scope
    from app.services.storage import get_storage

    doc = upload(client, "alice", "to-delete.pdf", pdf_bytes).json()
    did = doc["id"]
    client.post(f"/api/documents/{did}/chat", headers=auth("alice"), json={"question": "rooftop experiment"})
    with session_scope() as db:
        key = db.get(Document, did).s3_key
        uid = db.query(User).filter_by(firebase_uid="uid-alice").one().id
    assert get_storage().download(key) == pdf_bytes
    assert vector_store.count_document_vectors(uid, did) > 0

    assert client.delete(f"/api/documents/{did}", headers=auth("alice")).status_code == 204

    assert vector_store.count_document_vectors(uid, did) == 0
    with pytest.raises(Exception):
        get_storage().download(key)
    with session_scope() as db:
        assert db.get(Document, did) is None
        assert db.query(ChatSession).filter_by(document_id=did).count() == 0
    assert client.get(f"/api/documents/{did}", headers=auth("alice")).status_code == 404
