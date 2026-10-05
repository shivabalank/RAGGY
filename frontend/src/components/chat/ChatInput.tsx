import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function ChatInput({ onSend, disabled, placeholder }: { onSend: (t: string) => void; disabled?: boolean; placeholder?: string }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = ref.current; if (el) { el.style.height = 'auto'; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; } }, [text]);
  const send = () => { const t = text.trim(); if (!t || disabled) return; onSend(t); setText(''); };
  const key = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };
  return (
    <div className="border-t border-zinc-200 bg-white p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-soft transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
        <textarea ref={ref} rows={1} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={key} disabled={disabled}
          placeholder={placeholder ?? 'Ask anything about this document…'} aria-label="Message"
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none placeholder:text-zinc-400" />
        <button onClick={send} disabled={disabled || !text.trim()} aria-label="Send" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 active:scale-95 disabled:bg-zinc-200 disabled:text-zinc-400"><ArrowUp className="h-5 w-5" /></button>
      </div>
      <p className="mx-auto mt-2 hidden max-w-3xl text-center text-xs text-zinc-400 sm:block">Enter to send · Shift + Enter for a new line · Answers may contain mistakes, check the sources.</p>
    </div>
  );
}
