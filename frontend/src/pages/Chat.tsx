import { useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { Loader2, MessageSquare, Search } from 'lucide-react';
import { ChatWindow } from '../components/chat/ChatWindow';
import { FileIcon } from '../components/dashboard/DocumentCard';
import { MenuButton } from '../components/dashboard/Header';
import type { LayoutCtx } from '../components/dashboard/AppLayout';
import { useDocuments } from '../hooks/useDocuments';
import { cn, formatBytes } from '../lib/utils';

export default function Chat() {
  const { documentId } = useParams();
  const nav = useNavigate();
  const { docs, loading } = useDocuments();
  const [q, setQ] = useState('');
  useOutletContext<LayoutCtx>();
  const active = docs.find((d) => d.id === documentId);
  const list = docs.filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex h-[calc(100dvh-4rem)] md:h-[100dvh]">
      <aside className={cn('w-full shrink-0 flex-col border-r border-zinc-200 bg-white lg:flex lg:w-72', documentId ? 'hidden' : 'flex')}>
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-100 px-4"><MenuButton /><h1 className="text-lg font-semibold">Documents</h1></div>
        <div className="p-3">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search documents" className="h-10 w-full rounded-lg border border-zinc-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100" /></div>
        </div>
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {loading && <li className="grid place-items-center py-8"><Loader2 className="h-5 w-5 animate-spin text-brand-500" /></li>}
          {list.map((d) => (
            <li key={d.id}>
              <button onClick={() => nav(`/chat/${d.id}`)} className={cn('flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition', d.id === documentId ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-zinc-50')}>
                <FileIcon type={d.type} />
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{d.name}</span><span className="block text-xs text-zinc-500">{d.status === 'ready' ? formatBytes(d.size) : d.status === 'processing' ? 'Processing…' : 'Failed'}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className={cn('min-w-0 flex-1', documentId ? 'block' : 'hidden lg:block')}>
        {active ? <ChatWindow key={active.id} doc={active} onBack={() => nav('/chat')} />
          : documentId && loading ? <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
          : (
            <div className="grid h-full place-items-center p-8 text-center">
              <div><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MessageSquare className="h-7 w-7" /></span>
                <h2 className="mt-4 text-xl font-semibold">{documentId ? 'Document not found' : 'Choose a document'}</h2>
                <p className="mt-1 text-zinc-500">{documentId ? 'Pick another document from the list.' : 'Select a document on the left to start asking questions.'}</p></div>
            </div>
          )}
      </section>
    </div>
  );
}
