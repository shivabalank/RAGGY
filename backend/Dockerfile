# Backend image (CPU). Fine for the API + embeddings + reranker, and for LLM_PROVIDER=remote.
# For LLM_PROVIDER=local you need a CUDA base image + NVIDIA container toolkit (see README, Deployment).
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app

COPY requirements.txt .
RUN pip install --extra-index-url https://download.pytorch.org/whl/cpu torch \
    && pip install -r requirements.txt

COPY app ./app
COPY llm_server.py .

RUN useradd -m raggy && mkdir -p /app/storage && chown -R raggy /app
USER raggy
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
