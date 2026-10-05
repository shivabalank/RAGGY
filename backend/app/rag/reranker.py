"""Optional cross-encoder reranking (notebook CELL 8 + 18)."""
import logging
import threading
from typing import Any, Dict, List

from app.config import get_settings

logger = logging.getLogger(__name__)

_model = None
_load_lock = threading.Lock()
_predict_lock = threading.Lock()


def get_reranker_model():
    global _model
    if _model is None:
        with _load_lock:
            if _model is None:
                from sentence_transformers import CrossEncoder

                from app.rag.embeddings import _device

                mid = get_settings().reranker_model_id
                logger.info("Loading reranker %s ...", mid)
                _model = CrossEncoder(mid, device=_device())
    return _model


def rerank_documents(query: str, candidates: List[Dict[str, Any]], top_n: int | None = None) -> List[Dict[str, Any]]:
    s = get_settings()
    top_n = top_n or s.top_k
    if not s.use_reranker or not candidates:
        return candidates[:top_n]
    with _predict_lock:
        scores = get_reranker_model().predict([(query, c["text"]) for c in candidates])
    for c, sc in zip(candidates, scores):
        c["rerank_score"] = float(sc)
    return sorted(candidates, key=lambda c: c["rerank_score"], reverse=True)[:top_n]
