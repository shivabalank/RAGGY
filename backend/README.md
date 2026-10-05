# Raggy backend (FastAPI)

Full setup guide: see the root `README.md`. Quick commands:

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1          # Windows PowerShell   (Mac/Linux: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env               # Mac/Linux: cp .env.example .env   -> then fill in FIREBASE_PROJECT_ID, HF_TOKEN
uvicorn app.main:app --reload --port 8000
```

Tests: `pip install -r requirements-dev.txt && python -m pytest -q`
Docs (development only): http://localhost:8000/docs
