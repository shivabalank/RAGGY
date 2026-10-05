import type { ChatMessage, DocumentItem } from '../types';
import { authService } from './firebase';

/** FastAPI base URL including the /api prefix, e.g. http://localhost:8000/api */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

const NOT_CONFIGURED = 'The app is not connected to the server. Set VITE_API_URL in frontend/.env and restart npm run dev.';

/** Turns a FastAPI error body ({"detail": "..."}) into a clean message. Never shows raw HTML/stack traces. */
function errorMessage(status: number, body: string): string {
  try {
    const d = JSON.parse(body)?.detail;
    if (typeof d === 'string' && d) return d;
  } catch { /* not JSON */ }
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 413) return 'File is too large.';
  if (status >= 500) return 'The server had a problem. Please try again.';
  return 'Something went wrong. Please try again.';
}

async function headers(json = true): Promise<Record<string, string>> {
  const token = await authService.getToken();
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!BASE) throw new Error(NOT_CONFIGURED);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers: { ...(await headers(!(init.body instanceof FormData))), ...init.headers } });
  } catch {
    throw new Error('Cannot reach the server. Check that the backend is running.');
  }
  if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
  return res.status === 204 ? (undefined as T) : res.json();
}

/**
 * FastAPI contract (all under VITE_API_URL, Firebase ID token sent as `Authorization: Bearer`):
 *  POST   /documents            multipart "file"      -> DocumentItem
 *  GET    /documents                                  -> DocumentItem[]
 *  GET    /documents/:id                              -> DocumentItem
 *  DELETE /documents/:id
 *  GET    /documents/:id/download                     -> file
 *  POST   /documents/:id/chat   { question }          -> ChatMessage (with sources[])
 *  GET    /documents/:id/chat                         -> ChatMessage[]
 *  DELETE /documents/:id/chat
 */
export function uploadDocument(file: File, onProgress: (pct: number) => void, signal?: AbortSignal): Promise<DocumentItem> {
  return new Promise(async (resolve, reject) => {
    if (!BASE) return reject(new Error(NOT_CONFIGURED));
    const xhr = new XMLHttpRequest();
    const h = await headers(false);
    xhr.open('POST', `${BASE}/documents`);
    Object.entries(h).forEach(([k, v]) => xhr.setRequestHeader(k, v));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => (xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(errorMessage(xhr.status, xhr.responseText))));
    xhr.onerror = () => reject(new Error('Cannot reach the server. Check that the backend is running.'));
    signal?.addEventListener('abort', () => xhr.abort());
    const fd = new FormData(); fd.append('file', file);
    xhr.send(fd);
  });
}
export const getDocuments = (): Promise<DocumentItem[]> => request('/documents');
export const getDocument = (id: string): Promise<DocumentItem> => request(`/documents/${id}`);
export const deleteDocument = (id: string): Promise<void> => request(`/documents/${id}`, { method: 'DELETE' });
export const getChatHistory = (id: string): Promise<ChatMessage[]> => request(`/documents/${id}/chat`);
export const sendMessage = (id: string, question: string): Promise<ChatMessage> =>
  request(`/documents/${id}/chat`, { method: 'POST', body: JSON.stringify({ question }) });
export const clearChat = (id: string): Promise<void> => request(`/documents/${id}/chat`, { method: 'DELETE' });

export async function downloadDocument(doc: DocumentItem) {
  if (!BASE) throw new Error(NOT_CONFIGURED);
  const res = await fetch(`${BASE}/documents/${doc.id}/download`, { headers: await headers(false) });
  if (!res.ok) throw new Error(errorMessage(res.status, await res.text()));
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = doc.name; a.click();
  URL.revokeObjectURL(a.href);
}
