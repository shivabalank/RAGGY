"""Recursive chunking (notebook CELL 13). chunk_size/overlap come from config (800/120 by default)."""
from functools import lru_cache
from typing import Any, Dict, List

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings


@lru_cache
def _splitter() -> RecursiveCharacterTextSplitter:
    s = get_settings()
    return RecursiveCharacterTextSplitter(
        chunk_size=s.chunk_size,
        chunk_overlap=s.chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


def chunk_records(records: List[Dict[str, Any]], start_chunk_id: int = 0) -> List[Dict[str, Any]]:
    """Chunk the extraction records of ONE document, numbering chunks from start_chunk_id."""
    splitter = _splitter()
    chunks: List[Dict[str, Any]] = []
    cid = start_chunk_id

    if get_settings().use_structure_aware:
        groups = []
        current_key, current_text, current_meta = None, [], None
        for r in records:
            key = (r["source"], r.get("section"))
            if key != current_key:
                if current_text:
                    groups.append((current_meta, " ".join(current_text)))
                current_key, current_text, current_meta = key, [], r
            current_text.append(r["text"])
        if current_text:
            groups.append((current_meta, " ".join(current_text)))
        for meta, text in groups:
            for piece in splitter.split_text(text):
                chunks.append({"chunk_id": cid, "text": piece, "source": meta["source"],
                               "page": meta.get("page"), "section": meta.get("section")})
                cid += 1
    else:
        for r in records:
            for piece in splitter.split_text(r["text"]):
                chunks.append({"chunk_id": cid, "text": piece, "source": r["source"],
                               "page": r.get("page"), "section": r.get("section")})
                cid += 1
    return chunks
