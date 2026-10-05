"""Central configuration. Every setting comes from environment variables / backend/.env.

Nothing secret is ever hard-coded here.
"""
from functools import lru_cache
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # ---- App ----
    environment: str = "development"  # development | production
    frontend_url: str = "http://localhost:5173"  # comma-separated list allowed
    max_file_mb: int = 25  # keep in sync with MAX_FILE_MB in frontend/src/config.ts

    # ---- PostgreSQL ----
    database_url: str = "postgresql+psycopg://raggy:raggy@localhost:5432/raggy"

    # ---- File storage ----  "s3" (production) or "local" (development, no AWS needed)
    storage_backend: str = "local"
    local_storage_dir: str = "./storage"
    aws_access_key_id: Optional[str] = None  # leave empty on EC2 to use the instance's IAM role
    aws_secret_access_key: Optional[str] = None
    aws_region: str = "us-east-1"
    s3_bucket_name: Optional[str] = None

    # ---- Qdrant ----  QDRANT_URL set -> server/cloud.  Empty -> embedded local mode at QDRANT_PATH
    qdrant_url: Optional[str] = None
    qdrant_api_key: Optional[str] = None
    qdrant_path: str = "./qdrant_data"
    qdrant_collection: str = "document_assistant"

    # ---- Firebase Admin (token verification) ----
    firebase_project_id: str = ""
    firebase_client_email: Optional[str] = None  # optional: token verification only needs the project id
    firebase_private_key: Optional[str] = None

    # ---- RAG (defaults taken from the notebook) ----
    embedding_model_id: str = "BAAI/bge-small-en-v1.5"
    reranker_model_id: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    use_reranker: bool = True
    chunk_size: int = 800
    chunk_overlap: int = 120
    use_structure_aware: bool = False
    embed_batch_size: int = 16
    top_k: int = 5
    rerank_candidates: int = 15
    relevance_threshold: float = 0.35
    use_query_rewriting: bool = False

    # ---- LLM ----
    hf_token: Optional[str] = None
    llama_model_id: str = "meta-llama/Llama-2-7b-chat-hf"
    llm_provider: str = "local"  # "local" (this machine, NVIDIA GPU) | "remote" (OpenAI-compatible server)
    llm_remote_url: Optional[str] = None  # e.g. http://gpu-box:8001/v1
    llm_remote_api_key: Optional[str] = None
    use_4bit: bool = True
    max_new_tokens: int = 300
    temperature: float = 0.2
    top_p: float = 0.9
    warmup_embedder: bool = True
    warmup_llm: bool = False

    @field_validator("firebase_private_key")
    @classmethod
    def _fix_newlines(cls, v: Optional[str]) -> Optional[str]:
        # .env files store the private key with literal "\n" sequences
        return v.replace("\\n", "\n") if v else v

    @field_validator("qdrant_url", "qdrant_api_key", "s3_bucket_name", "aws_access_key_id",
                     "aws_secret_access_key", "hf_token", "llm_remote_url", "llm_remote_api_key",
                     "firebase_client_email", "firebase_private_key", mode="before")
    @classmethod
    def _empty_to_none(cls, v):
        # "QDRANT_URL=" in .env should mean "not set"
        return None if isinstance(v, str) and not v.strip() else v

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip().rstrip("/") for o in self.frontend_url.split(",") if o.strip()]

    @property
    def max_file_bytes(self) -> int:
        return self.max_file_mb * 1024 * 1024

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
