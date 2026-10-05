import { ReactNode } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Menu } from 'lucide-react';
import type { LayoutCtx } from './AppLayout';

export function MenuButton() {
  const ctx = useOutletContext<LayoutCtx | undefined>();
  return <button onClick={ctx?.openMenu} aria-label="Open menu" className="hidden rounded-lg p-2 text-zinc-600 hover:bg-brand-50 hover:text-brand-700 md:inline-flex lg:hidden"><Menu className="h-5 w-5" /></button>;
}

export function Header({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:px-6">
        <MenuButton />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="hidden truncate text-sm text-zinc-500 sm:block">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </header>
  );
}
