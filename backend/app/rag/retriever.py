"""Semantic retrieval (notebook CELL 17). Always scoped to one user's one document."""
from typing import Any, Dict, List

from app.config import get_settings
from app.rag import vector_store
from app.rag.embeddings import embed_query


def retrieve_documents(query: str, user_id: str, document_id: str, top_k: int | None = None) -> List[Dict[str, Any]]:
    top_k = top_k or get_settings().top_k
    return vector_store.search(embed_query(query), user_id=user_id, document_id=document_id, limit=top_k)
