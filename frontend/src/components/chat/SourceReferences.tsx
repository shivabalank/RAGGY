import { useState } from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Source } from '../../types';

export function SourceReferences({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!sources.length) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-brand-100 bg-brand-50/50">
      <p className="border-b border-brand-100 px-3 py-2 text-xs font-semibold text-brand-800">Sources</p>
      <ul>
        {sources.map((s, i) => (
          <li key={s.id} className="border-b border-brand-100 last:border-0">
            <button onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-brand-50">
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-brand-600 text-[11px] font-semibold text-white">{i + 1}</span>
              <FileText className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{s.documentName}{s.page != null ? <span className="font-normal text-zinc-500"> — Page {s.page}</span> : s.section ? <span className="font-normal text-zinc-500"> — Section: {s.section}</span> : null}</span>
              <ChevronDown className={cn('h-4 w-4 text-zinc-400 transition-transform', open === s.id && 'rotate-180')} />
            </button>
            {open === s.id && <p className="animate-fade-in border-t border-brand-100 bg-white px-3 py-3 text-sm italic leading-relaxed text-zinc-600">“{s.snippet}”</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
