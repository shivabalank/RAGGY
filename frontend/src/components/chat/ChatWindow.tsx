import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Eraser, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import * as api from '../../services/api';
import { MenuButton } from '../dashboard/Header';
import { FileIcon } from '../dashboard/DocumentCard';
import { formatBytes, uid } from '../../lib/utils';
import type { ChatMessage as Msg, DocumentItem } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ChatInput } from './ChatInput';
import { ChatMessage, TypingIndicator } from './ChatMessage';

const SUGGESTIONS = ['Summarize this document', 'What are the key findings?', 'List the main action items'];

export function ChatWindow({ doc, onBack }: { doc: DocumentItem; onBack: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const ready = doc.status === 'ready';

  useEffect(() => {
    let live = true;
    api.getChatHistory(doc.id).then((m) => live && setMessages(m)).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [doc.id]);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, sending]);

  const ask = async (q: string, base: Msg[] = messages) => {
    setMessages([...base, { id: uid(), role: 'user', content: q, createdAt: new Date().toISOString() }]);
    setSending(true);
    try { const a = await api.sendMessage(doc.id, q); setMessages((m) => [...m, a]); }
    catch { setMessages((m) => [...m, { id: uid(), role: 'assistant', error: true, createdAt: new Date().toISOString(), content: 'The answer could not be generated. Check your connection and try again.' }]); }
    finally { setSending(false); }
  };
  const regenerate = () => {
    const i = messages.map((m) => m.role).lastIndexOf('user');
    if (i >= 0) ask(messages[i].content, messages.slice(0, i));
  };
  const clear = async () => { await api.clearChat(doc.id); setMessages([]); setConfirm(false); };
  const lastAssistant = messages.length ? messages[messages.length - 1].role === 'assistant' ? messages[messages.length - 1].id : null : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-zinc-50">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b border-zinc-200 bg-white px-3 sm:px-5">
        <button onClick={onBack} aria-label="Back to documents" className="rounded-lg p-2 text-zinc-600 hover:bg-brand-50 lg:hidden"><ArrowLeft className="h-5 w-5" /></button>
        <div className="hidden md:block lg:hidden"><MenuButton /></div>
        <FileIcon type={doc.type} />
        <div className="min-w-0 flex-1 leading-tight">
          <h1 className="truncate font-semibold">{doc.name}</h1>
          <p className="truncate text-xs text-zinc-500">{doc.type.toUpperCase()}{doc.pages ? ` · ${doc.pages} pages` : ''} · {formatBytes(doc.size)}</p>
        </div>
        <Link to={`/documents/${doc.id}`} aria-label="Document details" className="rounded-lg p-2 text-zinc-500 hover:bg-brand-50 hover:text-brand-700"><ExternalLink className="h-4 w-4" /></Link>
        <button onClick={() => setConfirm(true)} disabled={!messages.length} aria-label="Clear chat" title="Clear chat" className="rounded-lg p-2 text-zinc-500 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-40"><Eraser className="h-4 w-4" /></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
          {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-500" /></div>
            : !messages.length && !sending ? (
              <div className="py-12 text-center animate-fade-in">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Sparkles className="h-7 w-7" /></span>
                <h2 className="mt-4 text-xl font-semibold">Ask questions about your document</h2>
                <p className="mx-auto mt-1 max-w-sm text-zinc-500">Answers come with the pages they were drawn from, so you can check every claim.</p>
                {ready && <div className="mt-6 flex flex-wrap justify-center gap-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => ask(s)} className="rounded-full border border-zinc-200 bg-white px-3.5 py-1.5 text-sm font-medium text-zinc-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700">{s}</button>)}</div>}
              </div>
            ) : messages.map((m) => <ChatMessage key={m.id} message={m} canRegenerate={m.id === lastAssistant && !sending} onRegenerate={regenerate} />)}
          {sending && <TypingIndicator />}
          <div ref={end} />
        </div>
      </div>

      {ready ? <ChatInput onSend={(t) => ask(t)} disabled={sending || loading} />
        : <p className="border-t border-zinc-200 bg-white p-4 text-center text-sm text-zinc-500">{doc.status === 'failed' ? 'This document failed to process, so chat is unavailable.' : 'This document is still processing. Chat unlocks when it is ready.'}</p>}

      <Modal open={confirm} onClose={() => setConfirm(false)} title="Clear this chat?" footer={<><Button variant="secondary" onClick={() => setConfirm(false)}>Cancel</Button><Button onClick={clear}>Clear chat</Button></>}>
        <p className="text-sm text-zinc-600">All messages for {doc.name} will be removed. The document itself is not affected.</p>
      </Modal>
    </div>
  );
}
