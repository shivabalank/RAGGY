import { DragEvent, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, Loader2, UploadCloud, X } from 'lucide-react';
import * as api from '../../services/api';
import { MAX_FILE_MB } from '../../config';
import { cn, formatBytes, sleep } from '../../lib/utils';
import type { DocumentItem } from '../../types';
import { Button } from '../ui/Button';

type Phase = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function DocumentUploader({ onUploaded }: { onUploaded?: (d: DocumentItem) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  const reset = () => { abort.current?.abort(); setPhase('idle'); setFile(null); setProgress(0); setError(''); if (input.current) input.current.value = ''; };
  const fail = (f: File | null, msg: string) => { setFile(f); setError(msg); setPhase('error'); };

  const start = async (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') return fail(f, 'Unsupported file type. Upload a PDF or DOCX.');
    if (f.size > MAX_FILE_MB * 1024 * 1024) return fail(f, `File is larger than ${MAX_FILE_MB} MB.`);
    const ac = new AbortController();
    abort.current = ac;
    setFile(f); setError(''); setProgress(0); setPhase('uploading');
    try {
      const doc = await api.uploadDocument(f, setProgress, ac.signal);
      onUploaded?.(doc);
      setPhase('processing');
      for (let i = 0; i < 400; i++) {
        if (ac.signal.aborted) return;
        const d = await api.getDocument(doc.id);
        if (d.status === 'ready') return setPhase('success');
        if (d.status === 'failed') throw new Error(d.error || 'We could not process this document. Try uploading it again.');
        await sleep(1500);
      }
    } catch (e) {
      if (ac.signal.aborted) return;
      fail(f, (e as Error).message || 'Upload failed. Try again.');
    }
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f && phase !== 'uploading') start(f); };

  const status = {
    uploading: { text: `Uploading… ${progress}%`, cls: 'text-brand-700' },
    processing: { text: 'Processing document — extracting text and building search index', cls: 'text-brand-700' },
    success: { text: 'Ready to chat', cls: 'text-emerald-600' },
    error: { text: error, cls: 'text-red-600' },
  } as const;

  return (
    <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
      className={cn('rounded-2xl border-2 border-dashed bg-white transition-all duration-200', drag ? 'border-brand-500 bg-brand-50' : 'border-brand-200 hover:border-brand-400', phase === 'error' && 'border-red-300')}>
      <input ref={input} type="file" hidden accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => e.target.files?.[0] && start(e.target.files[0])} />
      {phase === 'idle' ? (
        <button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center rounded-2xl px-6 py-10 text-center focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 sm:py-14">
          <span className={cn('grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition-transform duration-200', drag && 'scale-110')}><UploadCloud className="h-7 w-7" /></span>
          <span className="mt-4 text-lg font-semibold">Drag &amp; drop your document <span className="hidden sm:inline">here</span><span className="sm:hidden">or tap to choose</span></span>
          <span className="mt-1 hidden text-[15px] text-zinc-500 sm:block">or <span className="font-medium text-brand-600">click to browse</span></span>
          <span className="mt-4 flex gap-2 text-xs font-medium text-zinc-500"><span className="rounded-md bg-zinc-100 px-2 py-1">PDF</span><span className="rounded-md bg-zinc-100 px-2 py-1">DOCX</span><span className="px-1 py-1">Up to {MAX_FILE_MB} MB</span></span>
        </button>
      ) : (
        <div className="p-5 animate-fade-in">
          <div className="flex items-center gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-700"><FileText className="h-6 w-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{file?.name}</p>
              <p className="text-sm text-zinc-500">{file?.name.split('.').pop()?.toUpperCase()} · {file && formatBytes(file.size)}</p>
            </div>
            {phase === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-brand-600" />}
            {phase === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            {phase === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
            {(phase === 'uploading' || phase === 'processing') && <button onClick={reset} aria-label="Cancel" className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"><X className="h-4 w-4" /></button>}
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-brand-100" role="progressbar" aria-valuenow={phase === 'uploading' ? progress : 100}>
            <div className={cn('h-full rounded-full transition-all duration-300', phase === 'error' ? 'bg-red-400' : phase === 'success' ? 'bg-emerald-500' : 'bg-brand-600', phase === 'processing' && 'animate-pulse')} style={{ width: `${phase === 'uploading' ? progress : 100}%` }} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className={cn('text-sm font-medium', status[phase].cls)}>{status[phase].text}</p>
            {(phase === 'success' || phase === 'error') && <Button size="sm" variant="secondary" onClick={reset}>{phase === 'error' ? 'Try again' : 'Upload another'}</Button>}
          </div>
        </div>
      )}
    </div>
  );
}
