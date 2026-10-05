"""Embeddings via Sentence Transformers (notebook CELL 7 + 14). Vectors are L2-normalised for cosine similarity."""
import logging
import threading
from typing import List, Optional

import numpy as np

from app.config import get_settings

logger = logging.getLogger(__name__)

_model = None
_load_lock = threading.Lock()
_encode_lock = threading.Lock()


def _device() -> str:
    try:
        import torch

        return "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        return "cpu"


def get_embedding_model():
    global _model
    if _model is None:
        with _load_lock:
            if _model is None:
                from sentence_transformers import SentenceTransformer

                model_id = get_settings().embedding_model_id
                logger.info("Loading embedding model %s on %s ...", model_id, _device())
                _model = SentenceTransformer(model_id, device=_device())
    return _model


def embedding_dim() -> int:
    return int(get_embedding_model().get_sentence_embedding_dimension())


def embed_texts(texts: List[str], batch_size: Optional[int] = None) -> np.ndarray:
    model = get_embedding_model()
    with _encode_lock:  # one encode at a time; keeps GPU memory predictable
        return model.encode(
            texts,
            batch_size=batch_size or get_settings().embed_batch_size * 2,
            show_progress_bar=False,
            normalize_embeddings=True,  # required for cosine similarity
            convert_to_numpy=True,
        )


def embed_query(query: str) -> List[float]:
    model = get_embedding_model()
    with _encode_lock:
        return model.encode(query, normalize_embeddings=True).tolist()
