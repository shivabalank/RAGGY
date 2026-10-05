# Raggy — frontend

React + TypeScript + Vite + Tailwind. Talks to the FastAPI backend and Firebase Auth. Full guide: root `README.md`.

```bash
npm install
copy .env.example .env     # Mac/Linux: cp .env.example .env  -> fill VITE_FIREBASE_* values
npm run dev                # http://localhost:5173
```

* All API calls: `src/services/api.ts` (Firebase ID token sent as `Authorization: Bearer`; errors shown as clean messages).
* Auth: `src/services/firebase.ts` + `src/hooks/useAuth.tsx` (`AuthProvider`, `useAuth`, `ProtectedRoute`).
* Protected routes: `/dashboard /documents /documents/:id /chat /chat/:id /settings`; public: `/ /login /signup`.
* Only `VITE_*` values are visible in the browser — never put secrets in `frontend/.env`.
