"""Qdrant vector store (notebook CELL 15, 17), made multi-user.

* QDRANT_URL set  -> connect to a Qdrant server / Qdrant Cloud.
* QDRANT_URL empty -> embedded local mode at QDRANT_PATH (single process only).

EVERY search and delete is filtered by user_id AND document_id, so one user's chunks can never be
returned for another user, and one document never leaks into another.
"""
import logging
import threading
import uuid
from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

from app.config import get_settings

logger = logging.getLogger(__name__)

_client: Optional[QdrantClient] = None
_lock = threading.RLock()  # re-entrant: ensure_collection() calls get_client() while holding it
_collection_ready = False


class VectorStoreError(Exception):
    pass


def get_client() -> QdrantClient:
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                s = get_settings()
                if s.qdrant_url:
                    _client = QdrantClient(url=s.qdrant_url, api_key=s.qdrant_api_key, timeout=30)
                else:
                    logger.warning("QDRANT_URL not set - using embedded local Qdrant at %s", s.qdrant_path)
                    _client = QdrantClient(path=s.qdrant_path)
    return _client


def ensure_collection(dim: int) -> None:
    """Create the collection if missing (never wipes existing data)."""
    global _collection_ready
    if _collection_ready:
        return
    with _lock:
        if _collection_ready:
            return
        s, c = get_settings(), get_client()
        existing = [col.name for col in c.get_collections().collections]
        if s.qdrant_collection not in existing:
            c.create_collection(
                collection_name=s.qdrant_collection,
                vectors_config=qm.VectorParams(size=dim, distance=qm.Distance.COSINE),
            )
            logger.info("Created Qdrant collection '%s' (dim=%s, cosine)", s.qdrant_collection, dim)
        else:
            info = c.get_collection(s.qdrant_collection)
            vectors = info.config.params.vectors
            existing_dim = getattr(vectors, "size", None)
            if existing_dim is not None and existing_dim != dim:
                raise VectorStoreError(
                    f"Collection '{s.qdrant_collection}' has dimension {existing_dim} but the embedding model "
                    f"produces {dim}. Use a new QDRANT_COLLECTION name or delete the old collection."
                )
        # Payload indexes make the user/document filters fast on server deployments.
        for field in ("user_id", "document_id") if s.qdrant_url else ():  # no-op in embedded local mode
            try:
                c.create_payload_index(s.qdrant_collection, field_name=field, field_schema=qm.PayloadSchemaType.KEYWORD)
            except Exception as e:  # already exists / unsupported in local mode
                logger.debug("payload index %s: %s", field, e)
        _collection_ready = True


def _doc_filter(user_id: str, document_id: str) -> qm.Filter:
    return qm.Filter(must=[
        qm.FieldCondition(key="user_id", match=qm.MatchValue(value=user_id)),
        qm.FieldCondition(key="document_id", match=qm.MatchValue(value=document_id)),
    ])


def _point_id(document_id: str, chunk_id: int) -> str:
    # Deterministic: re-indexing the same document overwrites instead of duplicating.
    return str(uuid.uuid5(uuid.UUID(document_id), str(chunk_id)))


def upsert_chunks(user_id: str, document_id: str, chunks: List[Dict[str, Any]], vectors) -> None:
    points = [
        qm.PointStruct(
            id=_point_id(document_id, c["chunk_id"]),
            vector=v.tolist() if hasattr(v, "tolist") else list(v),
            payload={
                "user_id": user_id, "document_id": document_id, "text": c["text"], "source": c["source"],
                "page": c["page"], "section": c["section"], "chunk_id": c["chunk_id"],
            },
        )
        for c, v in zip(chunks, vectors)
    ]
    get_client().upsert(collection_name=get_settings().qdrant_collection, points=points)


def search(query_vector: List[float], user_id: str, document_id: str, limit: int) -> List[Dict[str, Any]]:
    resp = get_client().query_points(
        collection_name=get_settings().qdrant_collection,
        query=query_vector,
        limit=limit,
        query_filter=_doc_filter(user_id, document_id),
        with_payload=True,
    )
    return [{
        "text": p.payload["text"], "source": p.payload["source"], "page": p.payload.get("page"),
        "section": p.payload.get("section"), "chunk_id": p.payload.get("chunk_id"), "score": p.score,
    } for p in resp.points]


def delete_document_vectors(user_id: str, document_id: str) -> None:
    c, name = get_client(), get_settings().qdrant_collection
    if name not in [col.name for col in c.get_collections().collections]:
        return
    c.delete(collection_name=name, points_selector=qm.FilterSelector(filter=_doc_filter(user_id, document_id)))


def count_document_vectors(user_id: str, document_id: str) -> int:
    return get_client().count(
        collection_name=get_settings().qdrant_collection, count_filter=_doc_filter(user_id, document_id), exact=True
    ).count
