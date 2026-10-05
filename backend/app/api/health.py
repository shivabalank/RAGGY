from fastapi import APIRouter
from sqlalchemy import text

from app.config import get_settings
from app.services.database import engine

router = APIRouter()


@router.get("/health")
def health():
    """Public liveness check. In development it also reports dependency status."""
    out: dict = {"status": "ok"}
    if not get_settings().is_production:
        services = {}
        try:
            with engine.connect() as c:
                c.execute(text("SELECT 1"))
            services["database"] = "ok"
        except Exception:
            services["database"] = "unreachable"
        try:
            from app.rag.vector_store import get_client

            get_client().get_collections()
            services["qdrant"] = "ok"
        except Exception:
            services["qdrant"] = "unreachable"
        out["services"] = services
    return out
