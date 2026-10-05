import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, MessageSquare, Trash2 } from 'lucide-react';
import * as api from '../services/api';
import { Header } from '../components/dashboard/Header';
import { FileIcon, StatusBadge } from '../components/dashboard/DocumentCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { formatBytes, formatDate } from '../lib/utils';
import type { DocumentItem } from '../types';

export default function DocumentDetails() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState<DocumentItem | null>(null);
  const [missing, setMissing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { api.getDocument(id).then(setDoc).catch(() => setMissing(true)); }, [id]);

  if (missing) return <><Header title="Document" /><div className="p-8 text-center text-zinc-500">This document no longer exists. <Link className="font-semibold text-brand-600" to="/documents">Back to documents</Link></div></>;
  const rows = doc ? [['File type', doc.type.toUpperCase()], ['File size', formatBytes(doc.size)], ['Uploaded', formatDate(doc.uploadedAt)], ['Pages', doc.pages ? String(doc.pages) : 'Not available']] : [];

  return (
    <>
      <Header title="Document details" />
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <Link to="/documents" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-brand-700"><ArrowLeft className="h-4 w-4" />All documents</Link>
        {!doc ? <div className="h-64 animate-pulse rounded-2xl bg-white" /> : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-soft lg:min-h-[480px]">
              <FileIcon type={doc.type} size="lg" />
              <p className="mt-4 font-semibold">Preview</p>
              <p className="mt-1 max-w-xs text-sm text-zinc-500">A page preview will appear here once the backend provides document page images.</p>
            </div>
            <aside className="space-y-4">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
                <h2 className="break-words text-lg font-semibold">{doc.name}</h2>
                <div className="mt-2"><StatusBadge status={doc.status} /></div>
                <dl className="mt-4 divide-y divide-zinc-100 text-sm">
                  {rows.map(([k, v]) => <div key={k} className="flex justify-between py-2.5"><dt className="text-zinc-500">{k}</dt><dd className="font-medium">{v}</dd></div>)}
                </dl>
              </div>
              <div className="space-y-2">
                <Button size="lg" className="w-full" disabled={doc.status !== 'ready'} icon={<MessageSquare className="h-4 w-4" />} onClick={() => nav(`/chat/${doc.id}`)}>Chat with document</Button>
                <Button size="lg" variant="secondary" className="w-full" icon={<Download className="h-4 w-4" />} onClick={() => api.downloadDocument(doc)}>Download</Button>
                <Button size="lg" variant="danger" className="w-full" icon={<Trash2 className="h-4 w-4" />} onClick={() => setConfirm(true)}>Delete document</Button>
              </div>
            </aside>
          </div>
        )}
      </div>
      <Modal open={confirm} onClose={() => setConfirm(false)} title="Delete document?" footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={async () => { await api.deleteDocument(id); nav('/documents'); }}>Delete</Button></>}>
        <p className="text-sm text-zinc-600">{doc?.name} and its chat history will be permanently removed.</p>
      </Modal>
    </>
  );
}
