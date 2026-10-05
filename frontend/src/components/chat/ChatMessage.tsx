import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Check, Copy, RefreshCw } from 'lucide-react';
import type { ChatMessage as Msg } from '../../types';
import { cn } from '../../lib/utils';
import { Logo } from '../Logo';
import { SourceReferences } from './SourceReferences';

function useCopy() {
  const [done, setDone] = useState(false);
  return [done, (t: string) => { navigator.clipboard?.writeText(t); setDone(true); setTimeout(() => setDone(false), 1500); }] as const;
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [done, copy] = useCopy();
  return (
    <div className="my-3 overflow-hidden rounded-xl bg-[#1E1B2E] text-zinc-100">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5 text-xs text-zinc-400">
        <span>{lang ?? 'code'}</span>
        <button onClick={() => copy(code)} className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/10 hover:text-white">{done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in" aria-label="Assistant is typing">
      <Logo size={30} showText={false} />
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-zinc-200 bg-white px-4 py-3.5 shadow-soft">
        {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-dot rounded-full bg-brand-500" style={{ animationDelay: `${i * 0.18}s` }} />)}
      </div>
    </div>
  );
}

export function ChatMessage({ message, canRegenerate, onRegenerate }: { message: Msg; canRegenerate?: boolean; onRegenerate?: () => void }) {
  const [done, copy] = useCopy();
  if (message.role === 'user') {
    return (
      <div className="flex justify-end animate-slide-up">
        <p className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-600 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm sm:max-w-[75%]">{message.content}</p>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 animate-slide-up">
      <Logo size={30} showText={false} />
      <div className="min-w-0 max-w-[calc(100%-2.5rem)] flex-1 sm:max-w-[85%] sm:flex-none">
        <div className={cn('rounded-2xl rounded-tl-md border bg-white px-4 py-3 text-[15px] leading-relaxed shadow-soft', message.error ? 'border-red-200 text-red-700' : 'border-zinc-200')}>
          <div className="md">
            <ReactMarkdown components={{
              pre: ({ children }) => <>{children}</>,
              code: ({ className, children }) => {
                const text = String(children).replace(/\n$/, '');
                const lang = /language-(\w+)/.exec(className || '')?.[1];
                return lang || text.includes('\n') ? <CodeBlock lang={lang} code={text} /> : <code className="rounded bg-brand-50 px-1.5 py-0.5 text-[0.9em] font-medium text-brand-800">{children}</code>;
              },
              a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer">{children}</a>,
            }}>{message.content}</ReactMarkdown>
          </div>
          {message.sources && <SourceReferences sources={message.sources} />}
        </div>
        {!message.error && (
          <div className="mt-1.5 flex gap-1 pl-1 text-xs text-zinc-500">
            <button onClick={() => copy(message.content)} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-brand-50 hover:text-brand-700">{done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? 'Copied' : 'Copy'}</button>
            {canRegenerate && <button onClick={onRegenerate} className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-brand-50 hover:text-brand-700"><RefreshCw className="h-3.5 w-3.5" />Regenerate</button>}
          </div>
        )}
      </div>
    </div>
  );
}
