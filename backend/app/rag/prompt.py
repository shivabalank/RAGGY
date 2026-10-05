"""Grounded RAG prompt (notebook CELL 19). Answers must come ONLY from the retrieved context."""
from typing import Any, Dict, List

NOT_FOUND = "I could not find this information in the provided documents."

SYSTEM_PROMPT = f"""You are an AI document assistant.

Answer the user's question using ONLY the provided document context.
Do not use outside knowledge. Do not invent facts.
If the answer is not supported by the context, say exactly:
"{NOT_FOUND}"
Be concise. Mention which source(s) support your answer."""


def location_label(c: Dict[str, Any]) -> str:
    if c.get("page"):
        return f"page {c['page']}"
    return f"section '{c.get('section')}'"


def build_prompt(question: str, context_chunks: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    blocks = [f"[Source: {c['source']}, {location_label(c)}]\n{c['text']}" for c in context_chunks]
    context_str = "\n\n".join(blocks) if blocks else "(no relevant context found)"
    user_msg = f"""DOCUMENT CONTEXT:
{context_str}

USER QUESTION:
{question}

ANSWER:"""
    return [{"role": "system", "content": SYSTEM_PROMPT}, {"role": "user", "content": user_msg}]
