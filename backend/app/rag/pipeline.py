"""The RAG pipeline, ported from the notebook: process_documents_resumable() -> ingest_document(),
ask_rag() -> ask_rag().  Both are plain functions that FastAPI (or a future queue worker) can call.
"""
import logging
import uuid
from typing import Any, Dict, List, Optional, Tuple

from app.config import get_settings
from app.rag import vector_store
from app.rag.chunking import chunk_records
from app.rag.embeddings import embed_texts, embedding_dim
from app.rag.generator import get_llm_service
from app.rag.loaders import load_document
from app.rag.prompt import NOT_FOUND, build_prompt
from app.rag.reranker import rerank_documents
from app.rag.retriever import retrieve_documents

logger = logging.getLogger(__name__)


# --------------------------------------------------------------------------- ingestion
def ingest_document(data: bytes, filename: str, file_type: str, user_id: str, document_id: str) -> Dict[str, Any]:
    """bytes -> extract -> clean -> chunk -> embed -> Qdrant. Returns {"pages", "chunk_count"}."""
    s = get_settings()
    records, pages = load_document(data, filename, file_type)
    chunks = chunk_records(records, start_chunk_id=0)
    if not chunks:
        from app.rag.loaders import ExtractionError

        raise ExtractionError("No readable text was found in this document.")

    vector_store.ensure_collection(embedding_dim())
    vector_store.delete_document_vectors(user_id, document_id)  # make re-processing idempotent

    for start in range(0, len(chunks), s.embed_batch_size):
        batch = chunks[start:start + s.embed_batch_size]
        vectors = embed_texts([c["text"] for c in batch])
        vector_store.upsert_chunks(user_id, document_id, batch, vectors)
        logger.info("Indexed chunks %s-%s/%s of %s", start, start + len(batch), len(chunks), filename)
    return {"pages": pages, "chunk_count": len(chunks)}


# --------------------------------------------------------------------------- question answering
def _snippet(text: str, limit: int = 400) -> str:
    text = " ".join(text.split())
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


def get_sources(chunks: List[Dict[str, Any]], document_id: str) -> List[Dict[str, Any]]:
    """Source metadata comes ONLY from what Qdrant returned - never fabricated."""
    return [{
        "id": uuid.uuid4().hex, "documentId": document_id, "documentName": c["source"],
        "page": c.get("page"), "section": None if c.get("page") else c.get("section"),
        "snippet": _snippet(c["text"]), "score": round(c.get("rerank_score", c["score"]), 3),
    } for c in chunks]


def rewrite_query(question: str, history: List[Dict[str, str]]) -> str:
    """Optional (USE_QUERY_REWRITING): turn a follow-up into a standalone retrieval query."""
    hist = "\n".join(f"{m['role']}: {m['content']}" for m in history[-4:])
    msgs = [
        {"role": "system", "content": "Rewrite the follow-up question as a standalone question, using the "
                                      "conversation for context. Reply with ONLY the rewritten question."},
        {"role": "user", "content": f"Conversation so far:\n{hist}\n\nFollow-up question: {question}\n\nStandalone question:"},
    ]
    out = get_llm_service().generate(msgs).strip().split("\n")[0]
    return out or question


def ask_rag(question: str, user_id: str, document_id: str,
            conversation_history: Optional[List[Dict[str, str]]] = None) -> Tuple[str, List[Dict[str, Any]]]:
    s = get_settings()
    query = question
    if s.use_query_rewriting and conversation_history:
        try:
            query = rewrite_query(question, conversation_history)
        except Exception:
            logger.warning("Query rewriting failed; using the original question", exc_info=True)

    candidates = retrieve_documents(query, user_id, document_id, top_k=s.rerank_candidates)
    reranked = rerank_documents(query, candidates, top_n=s.top_k)

    if s.use_reranker:
        relevant = [c for c in reranked if c.get("rerank_score", c["score"]) >= s.relevance_threshold]
    else:
        relevant = [c for c in reranked if c["score"] >= s.relevance_threshold]

    if not relevant:
        return NOT_FOUND, []

    answer = get_llm_service().generate(build_prompt(question, relevant))
    if NOT_FOUND.lower() in answer.lower():
        return answer, []  # the model itself found nothing supported -> don't show unrelated sources
    return answer, get_sources(relevant, document_id)
