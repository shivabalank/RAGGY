import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download, FileText, Loader2, MessageSquare, MoreVertical, Trash2, Eye } from 'lucide-react';
import * as api from '../../services/api';
import { cn, formatBytes, formatDate } from '../../lib/utils';
import type { DocumentItem } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export function StatusBadge({ status }: { status: DocumentItem['status'] }) {
  if (status === 'ready') return <Badge tone="success">Ready</Badge>;
  if (status === 'failed') return <Badge tone="danger">Failed</Badge>;
  return <Badge tone="brand"><Loader2 className="h-3 w-3 animate-spin" />Processing</Badge>;
}
export function FileIcon({ type, size = 'md' }: { type: DocumentItem['type']; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('grid shrink-0 place-items-center rounded-xl', size === 'lg' ? 'h-14 w-14' : 'h-11 w-11', type === 'pdf' ? 'bg-brand-100 text-brand-700' : 'bg-indigo-50 text-indigo-700')}>
      <FileText className={size === 'lg' ? 'h-7 w-7' : 'h-5 w-5'} />
    </span>
  );
}

function MoreMenu({ doc, onDelete }: { doc: DocumentItem; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50';
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="More options" aria-expanded={open} className="rounded-lg p-2 text-zinc-400 hover:bg-brand-50 hover:text-brand-700"><MoreVertical className="h-4 w-4" /></button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 animate-fade-in overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-card">
          <button className={item} onClick={() => nav(`/documents/${doc.id}`)}><Eye className="h-4 w-4 text-zinc-500" />View details</button>
          <button className={item} onClick={() => { api.downloadDocument(doc); setOpen(false); }}><Download className="h-4 w-4 text-zinc-500" />Download</button>
          <button className={cn(item, 'text-red-600 hover:bg-red-50')} onClick={() => { setOpen(false); onDelete(); }}><Trash2 className="h-4 w-4" />Delete</button>
        </div>
      )}
    </div>
  );
}

export function DocumentCard({ doc, layout = 'card', onDelete }: { doc: DocumentItem; layout?: 'card' | 'row'; onDelete: (d: DocumentItem) => void }) {
  const nav = useNavigate();
  const ready = doc.status === 'ready';
  const meta = `${doc.type.toUpperCase()} · ${formatBytes(doc.size)} · ${formatDate(doc.uploadedAt)}`;
  const chat = <Button size="sm" disabled={!ready} icon={<MessageSquare className="h-4 w-4" />} onClick={() => nav(`/chat/${doc.id}`)}>Chat</Button>;
  const trash = <button onClick={() => onDelete(doc)} aria-label={`Delete ${doc.name}`} className="hidden rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 sm:block"><Trash2 className="h-4 w-4" /></button>;

  if (layout === 'row') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-soft transition hover:border-brand-300 sm:gap-4 sm:p-4">
        <FileIcon type={doc.type} />
        <div className="min-w-0 flex-1">
          <Link to={`/documents/${doc.id}`} className="block truncate font-semibold hover:text-brand-700">{doc.name}</Link>
          <p className="truncate text-sm text-zinc-500">{meta}</p>
        </div>
        <div className="hidden sm:block"><StatusBadge status={doc.status} /></div>
        {chat}{trash}
        <MoreMenu doc={doc} onDelete={() => onDelete(doc)} />
      </div>
    );
  }
  return (
    <div className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-4 shadow-soft transition hover:border-brand-300">
      <div className="flex items-start justify-between">
        <FileIcon type={doc.type} />
        <MoreMenu doc={doc} onDelete={() => onDelete(doc)} />
      </div>
      <Link to={`/documents/${doc.id}`} className="mt-3 block truncate font-semibold hover:text-brand-700">{doc.name}</Link>
      <p className="mt-0.5 text-sm text-zinc-500">{meta}</p>
      <div className="mt-4 flex items-center justify-between">
        <StatusBadge status={doc.status} />
        {chat}
      </div>
    </div>
  );
}

export function DocumentSkeleton({ n = 3 }: { n?: number }) {
  return <>{Array.from({ length: n }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl border border-zinc-200 bg-white" />)}</>;
}
