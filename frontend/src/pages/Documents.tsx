import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Header } from '../components/dashboard/Header';
import { DocumentCard } from '../components/dashboard/DocumentCard';
import { DocumentUploader } from '../components/upload/DocumentUploader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useDocuments } from '../hooks/useDocuments';
import { cn } from '../lib/utils';
import type { DocStatus, DocumentItem } from '../types';

const FILTERS: { id: 'all' | DocStatus; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'ready', label: 'Ready' }, { id: 'processing', label: 'Processing' }, { id: 'failed', label: 'Failed' },
];

export default function Documents() {
  const { docs, loading, error, add, remove, refresh } = useDocuments();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | DocStatus>('all');
  const [upload, setUpload] = useState(false);
  const [target, setTarget] = useState<DocumentItem | null>(null);
  const list = useMemo(() => docs.filter((d) => (filter === 'all' || d.status === filter) && d.name.toLowerCase().includes(q.toLowerCase())), [docs, q, filter]);

  return (
    <>
      <Header title="Documents" subtitle={`${docs.length} uploaded`} actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => setUpload(true)}>Upload</Button>} />
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-80"><Input placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} icon={<Search className="h-4 w-4" />} aria-label="Search documents" /></div>
          <div className="flex gap-1.5 overflow-x-auto">
            {FILTERS.map((f) => <button key={f.id} onClick={() => setFilter(f.id)} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition', filter === f.id ? 'bg-brand-600 text-white' : 'bg-white text-zinc-600 ring-1 ring-zinc-200 hover:bg-brand-50 hover:text-brand-700')}>{f.label}</button>)}
          </div>
        </div>
        {error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">Could not load documents: {error} <button className="font-semibold underline" onClick={refresh}>Retry</button></p>}
        <div className="space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[74px] animate-pulse rounded-xl border border-zinc-200 bg-white" />)
            : list.length ? list.map((d) => <DocumentCard key={d.id} doc={d} layout="row" onDelete={setTarget} />)
            : <p className="rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500">{docs.length ? 'No documents match your search.' : 'No documents yet. Select Upload to add your first one.'}</p>}
        </div>
      </div>
      <Modal open={upload} onClose={() => setUpload(false)} title="Upload a document" wide><DocumentUploader onUploaded={add} /></Modal>
      <Modal open={!!target} onClose={() => setTarget(null)} title="Delete document?" footer={<><Button variant="secondary" onClick={() => setTarget(null)}>Cancel</Button><Button onClick={async () => { await remove(target!.id); setTarget(null); }}>Delete</Button></>}>
        <p className="text-sm text-zinc-600">{target?.name} and its chat history will be permanently removed.</p>
      </Modal>
    </>
  );
}
