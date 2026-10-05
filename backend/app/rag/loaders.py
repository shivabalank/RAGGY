"""Document text extraction (notebook CELL 10-12), adapted to work on in-memory bytes.

Records have the notebook's common shape:
    {"text", "source", "page", "section", "chunk_id"}
PDF pages are real page numbers. DOCX never gets a page number (page=None) - only the heading/section.
"""
import io
import logging
import re
from typing import Any, Dict, List, Tuple

import docx  # python-docx
import pymupdf as fitz  # PyMuPDF

logger = logging.getLogger(__name__)


class ExtractionError(Exception):
    """Raised when a document cannot be read. The message is safe to show to users."""


def extract_pdf_text(data: bytes, filename: str) -> Tuple[List[Dict[str, Any]], int]:
    """Page-level text + metadata. Returns (records, total_page_count)."""
    try:
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        logger.error("Could not open PDF %s: %s", filename, e)
        raise ExtractionError("This PDF could not be opened. It may be corrupted or password-protected.") from e

    if doc.needs_pass:
        doc.close()
        raise ExtractionError("This PDF is password-protected.")

    records: List[Dict[str, Any]] = []
    total_pages = len(doc)
    for page_num, page in enumerate(doc, start=1):
        try:
            text = page.get_text("text")
        except Exception as e:
            logger.warning("Extraction failed on %s page %s: %s", filename, page_num, e)
            continue
        if not text or not text.strip():
            continue  # skip empty pages
        records.append({"text": text, "source": filename, "page": page_num, "section": None, "chunk_id": None})
    doc.close()
    return records, total_pages


def extract_docx_text(data: bytes, filename: str) -> List[Dict[str, Any]]:
    """Paragraph-level text + metadata. We never invent page numbers for DOCX; we track headings as `section`."""
    try:
        d = docx.Document(io.BytesIO(data))
    except Exception as e:
        logger.error("Could not open DOCX %s: %s", filename, e)
        raise ExtractionError("This Word document could not be opened. It may be corrupted.") from e

    records: List[Dict[str, Any]] = []
    current_section = "Document Start"
    for para_num, para in enumerate(d.paragraphs, start=1):
        text = para.text
        if not text or not text.strip():
            continue
        style_name = (para.style.name or "").lower() if para.style is not None else ""
        if style_name.startswith("heading") or style_name == "title":
            current_section = text.strip()
        records.append({
            "text": text, "source": filename, "page": None,  # never invented for DOCX
            "section": current_section, "chunk_id": None, "paragraph": para_num,
        })
    return records


def clean_text(text: str) -> str:
    """Collapse whitespace while preserving paragraph breaks (notebook CELL 12)."""
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def load_document(data: bytes, filename: str, file_type: str) -> Tuple[List[Dict[str, Any]], int | None]:
    """Extract + clean. Returns (records, pdf_page_count or None)."""
    pages = None
    if file_type == "pdf":
        records, pages = extract_pdf_text(data, filename)
    elif file_type == "docx":
        records = extract_docx_text(data, filename)
    else:
        raise ExtractionError("Unsupported file type.")

    for r in records:
        r["text"] = clean_text(r["text"])
    records = [r for r in records if r["text"]]
    if not records:
        raise ExtractionError(
            "No readable text was found in this document. Scanned/image-only files are not supported."
        )
    return records, pages
