# Raggy — RAG Document Assistant

Upload a PDF or Word file, ask questions, get answers grounded in that document — with the pages/sections used as sources.

```
React + Vite (Vercel)  ──►  FastAPI (AWS EC2)  ──►  PostgreSQL   users, documents, chat history
        │                        │               ──►  Amazon S3    original PDF/DOCX files
   Firebase Auth                 │               ──►  Qdrant       chunk embeddings (vector search)
   (sign-in, ID token)           └──►  Llama 2-7B Chat (GPU)  answers
```

**Which person can see which document?** Only the account that uploaded it. The backend checks the
Firebase login token on *every* request and filters documents, files, vectors and chat history by that
account. Another user gets a plain "not found" for your document IDs (this is covered by automated tests).

---

## 0. What you need to install (once)

| Tool | Why | Get it |
|---|---|---|
| **VS Code** | editor | https://code.visualstudio.com |
| **Node.js 20.19+** | runs the frontend | https://nodejs.org (choose LTS) |
| **Python 3.11 or 3.12** | runs the backend | https://www.python.org/downloads (Windows: tick **Add Python to PATH**) |
| **Docker Desktop** | runs PostgreSQL + Qdrant for you, no manual database setup | https://www.docker.com/products/docker-desktop |
| **Git** | version control | https://git-scm.com |

Check in the VS Code terminal (`Ctrl+` `` ` ``): `node -v`, `python --version` (Windows may need `py --version`), `docker --version`.

---

## 1. The honest bit about Llama 2-7B (read this first)

Llama 2-7B is a large model (~13 GB download). Two ways to run it:

* **A. On your own computer — needs an NVIDIA GPU** with roughly 8 GB+ VRAM (the app loads it in 4-bit to fit).
  No NVIDIA GPU (e.g. most laptops, all Macs)? It will not run locally.
* **B. On a separate GPU machine** (AWS GPU EC2, a cloud GPU, a Hugging Face Inference *Endpoint*…) and the backend calls it.
  `backend/llm_server.py` is included for exactly this.

Hugging Face's free/serverless API does **not** serve Llama-2-7b-chat, so an HF token alone is not enough — the token is only
used to *download* the model (after you accept Meta's licence).

**Good news:** everything except the final "generate the answer" step works without the LLM — sign-in, upload, S3/local storage,
text extraction, chunking, embeddings, Qdrant, document list, delete, history. So you can set up and test the whole app first,
and sort out the GPU afterwards. Without an LLM, chat shows a clear "language model unavailable" message instead of crashing.

### Hugging Face setup (where your HF secret key goes)
1. Open https://huggingface.co/meta-llama/Llama-2-7b-chat-hf while logged in, and request/accept access (Meta's licence). Approval can take a while.
2. Make sure your token can read gated repos: https://huggingface.co/settings/tokens (a **Read** token is enough).
3. Put it **only** in `backend/.env`:  `HF_TOKEN=hf_xxxxxxxx`
   Never put it in `frontend/`, in source code, or in GitHub. `.gitignore` already excludes `.env` files.

---

## 2. Open the project

```bash
cd raggy          # the folder you unzipped
code .            # opens VS Code here
```

Layout:

```
raggy/
├─ frontend/            your React app (UI unchanged) – now talks to the real backend
├─ backend/             FastAPI + RAG pipeline (ported from your notebook)
│  ├─ app/rag/          loaders, chunking, embeddings, vector_store, retriever, reranker, prompt, generator, pipeline
│  ├─ app/api/          auth, documents, chat, health routes
│  ├─ app/services/     firebase, s3, local_storage, database, ingestion, chat_service
│  ├─ llm_server.py     optional stand-alone Llama server for a GPU machine
│  └─ tests/            19 automated tests
├─ colab/               Colab notebook that serves Llama 2-7B on a free GPU
├─ docker-compose.yml   PostgreSQL + Qdrant (+ optional backend)
└─ README.md
```

---

## 3. Create your Firebase project (login system) — free

1. Go to https://console.firebase.google.com → **Create a project** (any name, e.g. `raggy`; Analytics can be off).
2. **Build → Authentication → Get started → Sign-in method**: enable **Email/Password** and **Google** (Google asks for a support email).
3. **Project settings (gear icon) → General → Your apps → Web app (`</>`)** → register an app (no hosting needed). Firebase shows a `firebaseConfig` block.
4. Copy those values into `frontend/.env` (next step). `localhost` is already an authorised domain.

The Firebase web config is *meant* to be public. Your private HF token is not — keep it in `backend/.env` only.

---

## 4. Configure the environment files

**Windows (PowerShell) / Mac / Linux**

```bash
# Windows PowerShell
copy frontend\.env.example frontend\.env
copy backend\.env.example  backend\.env

# Mac / Linux
cp frontend/.env.example frontend/.env
cp backend/.env.example  backend/.env
```

**`frontend/.env`** — paste the six `VITE_FIREBASE_*` values from step 3. `VITE_API_URL` is already `http://localhost:8000/api`.

**`backend/.env`** — set at minimum:

```
FIREBASE_PROJECT_ID=<your Firebase project id>     # Project settings → General → Project ID
HF_TOKEN=<your Hugging Face token>
```

Everything else already works for local development:
`STORAGE_BACKEND=local` (files saved on your PC instead of S3), PostgreSQL and Qdrant URLs matching Docker.

---

## 5. Start PostgreSQL + Qdrant (Docker)

Make sure Docker Desktop is running, then from the `raggy/` folder:

```bash
docker compose up -d
docker compose ps        # both should say "running" / "healthy"
```

That's the whole database setup. The backend creates its tables automatically on first start.
(No Docker? Set `QDRANT_URL=` empty in `backend/.env` for embedded Qdrant, and either install PostgreSQL yourself or use
`DATABASE_URL=sqlite:///./raggy.db` for a quick trial — not recommended for production.)

---

## 6. Run the backend

```bash
cd backend

# --- Windows PowerShell ---
python -m venv .venv
.venv\Scripts\Activate.ps1          # if blocked: Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
# --- Mac / Linux ---
# python3 -m venv .venv && source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

* First start downloads two small models (embeddings ≈130 MB, reranker ≈90 MB) — wait for "Raggy API ready".
* Check http://localhost:8000/api/health → `{"status":"ok","services":{"database":"ok","qdrant":"ok"}}`
* Interactive API docs (dev only): http://localhost:8000/docs

### Local Llama (only if you have an NVIDIA GPU)
```bash
# install the CUDA build of PyTorch first – pick your CUDA version at https://pytorch.org/get-started/locally
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements-llm.txt
```
Keep `LLM_PROVIDER=local` in `.env`. The first question triggers a ~13 GB download, so it takes several minutes once
(set `WARMUP_LLM=true` to load it at startup instead).

### Llama on free Google Colab (recommended if you have no big GPU)
Use `colab/Raggy_LLM_Server_Colab.ipynb`:
1. Go to https://colab.research.google.com → **File → Upload notebook** → choose that file.
2. `Runtime → Change runtime type → T4 GPU → Save`.
3. Left sidebar → **key icon (Secrets)** → add `HF_TOKEN` (your Hugging Face token) → turn **Notebook access ON**.
4. `Runtime → Run all`. The first run downloads ~13 GB (several minutes). Cell 6 prints three lines:
   ```
   LLM_PROVIDER=remote
   LLM_REMOTE_URL=https://something.trycloudflare.com/v1
   LLM_REMOTE_API_KEY=...
   ```
5. Paste them into `backend/.env` (replacing the existing `LLM_PROVIDER` / `LLM_REMOTE_*` lines) and **restart the backend** (`Ctrl+C`, then `uvicorn app.main:app --reload --port 8000`).
6. Keep the Colab tab open while you use Raggy. Every new Colab session gives a **new URL** (and a new password unless you saved a Colab secret named `LLM_SERVER_API_KEY`), so repeat step 5.

### Llama on a separate GPU machine
On the GPU machine (same repo, same `HF_TOKEN` in its `.env`, plus `requirements-llm.txt`):
```bash
export LLM_SERVER_API_KEY=choose-a-long-random-string
uvicorn llm_server:app --host 0.0.0.0 --port 8001
```
Then in your main `backend/.env`:
```
LLM_PROVIDER=remote
LLM_REMOTE_URL=http://<gpu-machine-address>:8001/v1
LLM_REMOTE_API_KEY=choose-a-long-random-string
```
Restrict port 8001 to your backend's IP in the firewall/security group. Any OpenAI-compatible Llama-2 server
(vLLM, TGI, an HF Inference Endpoint) works the same way.

---

## 7. Run the frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```
Open http://localhost:5173 .

---

## 8. Try it (checklist)

1. **Create account** → you land on the dashboard. Sign out, sign back in. Try **Continue with Google** and **Forgot password**.
2. **Upload** a PDF or DOCX → status goes *Uploading → Processing → Ready*.
3. Open it → **Chat** → ask a question → answer + **Sources** (PDF: page; DOCX: section).
4. Ask something not in the document → *"I could not find this information in the provided documents."*
5. Reload the page → chat history is still there.
6. **Delete** the document → file, vectors and chat are removed.
7. Create a **second account** (different email, e.g. in a private window): it sees an empty document list and cannot open the first account's documents.

Run the automated tests any time (no GPU/internet needed):
```bash
cd backend
pip install -r requirements-dev.txt
python -m pytest -q
```

---

## 9. Amazon S3 (when you're ready for production storage)

Local mode is enough for learning. To switch to S3:

1. AWS Console → **S3 → Create bucket**. Pick a region, keep **Block all public access ON**, keep default encryption.
2. AWS Console → **IAM → Users → Create user** (e.g. `raggy-backend`), no console access. Attach this inline policy (replace `YOUR_BUCKET`):
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
         "Resource": "arn:aws:s3:::YOUR_BUCKET/users/*" }
     ]
   }
   ```
3. User → **Security credentials → Create access key** → put them in `backend/.env`:
   ```
   STORAGE_BACKEND=s3
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=<your bucket region>
   S3_BUCKET_NAME=<your bucket>
   ```
4. Restart the backend. Objects are stored as `users/{firebase_uid}/documents/{document_id}/{filename}` with server-side encryption.

On EC2, skip the access keys: attach an **IAM role** with the same policy to the instance and leave the key variables empty.
AWS usage can cost money — set a billing alert (Billing → Budgets).

---

## 10. API endpoints (all under `/api`, all except health need `Authorization: Bearer <Firebase ID token>`)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | liveness check (public) |
| GET | `/me` | current user |
| GET | `/documents` | list **my** documents |
| POST | `/documents` (alias `/documents/upload`) | upload PDF/DOCX (multipart `file`), starts background processing |
| GET | `/documents/{id}` | details + status (`processing` / `ready` / `failed`) |
| GET | `/documents/{id}/download` | download original file |
| DELETE | `/documents/{id}` | delete S3 object + Qdrant vectors + chat + DB row |
| POST | `/documents/{id}/chat` | `{question}` → assistant message with `sources[]` |
| GET / DELETE | `/documents/{id}/chat` | load / clear chat history |
| POST | `/chat` | spec-style: `{document_id, question, conversation_history?}` → `{answer, sources, message}` |
| GET / DELETE | `/chat/{document_id}/history` | spec-style history aliases |

Errors are returned as `{"detail": "friendly message"}`; stack traces go to the server log only.

---

## 11. How the RAG pipeline works

Ported from your notebook (same settings: chunk 800 / overlap 120, top-k 5, 15 rerank candidates, threshold 0.35).

**Upload:** validate → save to storage → *background job:* PyMuPDF / python-docx extract (real PDF pages; DOCX headings as `section`, never invented pages) → clean →
`RecursiveCharacterTextSplitter` → `BAAI/bge-small-en-v1.5` (normalised) → Qdrant with `{user_id, document_id, source, page, section, chunk_id}` → status `ready`.

**Question:** embed question → Qdrant search **filtered by `user_id` AND `document_id`** → cross-encoder rerank
(`ms-marco-MiniLM-L-6-v2`) → drop chunks below the relevance threshold → if none: *"I could not find this information…"* →
otherwise grounded prompt → Llama 2-7B Chat → answer + sources → saved to PostgreSQL.

Tuning knobs are all in `.env` (`CHUNK_SIZE`, `TOP_K`, `RELEVANCE_THRESHOLD`, `USE_RERANKER`, …).
Note: broad requests like "Summarise this document" can score below the threshold and get the "not found" reply — lower
`RELEVANCE_THRESHOLD` (e.g. `0.0`) if you want those to pass.

Where the pieces live: `rag/loaders.py` (extract/clean) · `chunking.py` · `embeddings.py` · `vector_store.py` · `retriever.py` ·
`reranker.py` · `prompt.py` · `generator.py` (**swappable LLM layer**: `local` or `remote`) · `pipeline.py` (`ingest_document`, `ask_rag`).

---

## 12. Deployment

| Piece | Where |
|---|---|
| Frontend | **Vercel** — import the GitHub repo, set *Root Directory* = `frontend`, add the `VITE_*` variables (`VITE_API_URL=https://api.yourdomain.com/api`). `vercel.json` makes page refreshes work. |
| Backend | **EC2** — run with Docker (`backend/Dockerfile`) or `uvicorn` behind **HTTPS** (Caddy/Nginx + a domain). The Vercel site is HTTPS, so browsers block calls to a plain `http://` API. |
| LLM | **GPU instance** (e.g. g4dn.xlarge or bigger) running `llm_server.py` or vLLM; backend uses `LLM_PROVIDER=remote`. A small CPU instance cannot run Llama-2-7B. |
| Files | S3 (section 9) |
| Database | PostgreSQL — Amazon RDS recommended (or the Docker container for small projects) |
| Vectors | Qdrant Cloud, or Qdrant in Docker on a server (set `QDRANT_URL`, `QDRANT_API_KEY`) |

Production checklist:
1. `ENVIRONMENT=production` (hides `/docs` and dependency details in `/api/health`).
2. `FRONTEND_URL=https://your-app.vercel.app` (CORS allows only this origin — never `*`).
3. Firebase console → Authentication → Settings → **Authorized domains**: add your Vercel domain.
4. Change the database password from the Docker default; don't expose ports 5432/6333 to the internet.
5. Put secrets in EC2 environment/Secrets Manager, not in files committed to Git.

---

## 13. Push to GitHub safely

```bash
git init
git add .
git status        # confirm NO .env files are listed
git commit -m "Raggy"
```
`.gitignore` excludes `.env`, `node_modules`, local storage and Qdrant data. If a secret is ever committed, **revoke it** (new HF token, new AWS key) — deleting the file is not enough.

---

## 14. Security summary

* Firebase ID token verified on every request; identity = Firebase UID, never a client-supplied id.
* Every document/chat/download/delete query is scoped to the token's user; foreign ids return 404 (no existence leak).
* Qdrant search/delete always filtered by `user_id` + `document_id`.
* S3 keys are per-user prefixes and re-checked before access; local-storage path traversal blocked.
* Uploads: `.pdf`/`.docx` only, content signature checked, 25 MB limit.
* CORS restricted to `FRONTEND_URL`; secrets only from environment; no secrets in the frontend.

## 15. Troubleshooting

| Symptom | Fix |
|---|---|
| Login page says "Firebase is not configured" | Fill `frontend/.env`, then **restart** `npm run dev` |
| Google popup error `unauthorized-domain` | Add the domain in Firebase → Authentication → Settings → Authorized domains |
| "Your session has expired" on every call | `FIREBASE_PROJECT_ID` in `backend/.env` must equal the Firebase project of the frontend |
| `/api/health` shows `database: unreachable` | `docker compose ps`; is Docker Desktop running? |
| `qdrant: unreachable` | same; or empty `QDRANT_URL` to use embedded mode |
| "needs an NVIDIA GPU" message in chat | Use `LLM_PROVIDER=remote` (section 6) |
| "language model could not be loaded" | Accept the Llama 2 licence on Hugging Face and check `HF_TOKEN` |
| CORS error in the browser console | `FRONTEND_URL` must exactly match the page's origin (e.g. `http://localhost:5173`) |
| Document stuck / "Failed" | Scanned (image-only) PDFs have no text and aren't supported; check the backend terminal for details |
