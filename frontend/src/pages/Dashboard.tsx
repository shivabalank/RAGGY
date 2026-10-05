import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FileText, FolderOpen, Loader2 } from 'lucide-react';
import { Header } from '../components/dashboard/Header';
import { DocumentCard, DocumentSkeleton } from '../components/dashboard/DocumentCard';
import { DocumentUploader } from '../components/upload/DocumentUploader';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { useAuth } from '../hooks/useAuth';
import { useDocuments } from '../hooks/useDocuments';
import type { DocumentItem } from '../types';

export default function Dashboard() {
  const { user } = useAuth();
  const { docs, loading, add, remove } = useDocuments();
  const [target, setTarget] = useState<DocumentItem | null>(null);
  const stats = [
    { label: 'Documents', value: docs.length, icon: FileText },
    { label: 'Ready to chat', value: docs.filter((d) => d.status === 'ready').length, icon: FolderOpen },
    { label: 'Processing', value: docs.filter((d) => d.status === 'processing').length, icon: Loader2 },
  ];
  return (
    <>
      <Header title="Dashboard" />
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Welcome back, {user?.name.split(' ')[0]} 👋</h2>
          <p className="mt-1 text-zinc-500">Upload a document to start asking questions about it.</p>
        </section>
        <DocumentUploader onUploaded={add} />
        <section className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-soft sm:p-4">
              <Icon className="h-4 w-4 text-brand-600 sm:h-5 sm:w-5" />
              <p className="mt-2 text-2xl font-bold sm:text-3xl">{loading ? '–' : value}</p>
              <p className="text-xs text-zinc-500 sm:text-sm">{label}</p>
            </div>
          ))}
        </section>
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent documents</h2>
            <Link to="/documents" className="text-sm font-medium text-brand-600 hover:text-brand-800">View all</Link>
          </div>
          {!loading && !docs.length ? <p className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-zinc-500">No documents yet. Upload one above to get started.</p> : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? <DocumentSkeleton /> : docs.slice(0, 6).map((d) => <DocumentCard key={d.id} doc={d} onDelete={setTarget} />)}
            </div>
          )}
        </section>
      </div>
      <Modal open={!!target} onClose={() => setTarget(null)} title="Delete document?" footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button onClick={async () => { await remove(target!.id); setTarget(null); }}>Delete</Button></>}>
        <p className="text-sm text-zinc-600">{target?.name} and its chat history will be permanently removed.</p>
      </Modal>
    </>
  );
}
