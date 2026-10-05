import logging
import threading
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, chat, documents, health
from app.config import get_settings
from app.services.database import init_db
from app.services.ingestion import fail_interrupted_documents

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("raggy")
settings = get_settings()


def _warmup() -> None:
    try:
        if settings.warmup_embedder:
            from app.rag.embeddings import get_embedding_model

            get_embedding_model()
            if settings.use_reranker:
                from app.rag.reranker import get_reranker_model

                get_reranker_model()
        if settings.warmup_llm:
            from app.rag.generator import get_llm_service

            get_llm_service().warmup()
    except Exception:
        logger.exception("Model warm-up failed (it will be retried on first use)")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()  # creates tables on first run
    fail_interrupted_documents()
    threading.Thread(target=_warmup, daemon=True).start()  # load models in the background
    logger.info("Raggy API ready (storage=%s, llm=%s)", settings.storage_backend, settings.llm_provider)
    yield


app = FastAPI(title="Raggy API", version="1.0.0", lifespan=lifespan,
              docs_url=None if settings.is_production else "/docs", redoc_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # never "*"
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

for r in (health.router, auth.router, documents.router, chat.router):
    app.include_router(r, prefix="/api")


@app.exception_handler(RequestValidationError)
async def _validation(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request. Please check your input."})


@app.exception_handler(Exception)
async def _unhandled(_: Request, exc: Exception):
    logger.exception("Unhandled error")  # full details only in the server log
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again."})
