import { useCallback, useEffect, useState } from 'react';
import * as api from '../services/api';
import type { DocumentItem } from '../types';

export function useDocuments() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try { setDocs(await api.getDocuments()); setError(null); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    if (!docs.some((d) => d.status === 'processing')) return;
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [docs, refresh]);

  const remove = async (id: string) => { await api.deleteDocument(id); setDocs((d) => d.filter((x) => x.id !== id)); };
  const add = (doc: DocumentItem) => setDocs((p) => [doc, ...p.filter((x) => x.id !== doc.id)]);
  return { docs, loading, error, refresh, remove, add };
}
