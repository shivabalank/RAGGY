import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav, Sidebar } from './Sidebar';

export interface LayoutCtx { openMenu: () => void }

export function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="min-h-[100dvh] bg-zinc-50">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="pb-16 md:pb-0 lg:pl-64">
        <div key={pathname} className="animate-fade-in"><Outlet context={{ openMenu: () => setOpen(true) } satisfies LayoutCtx} /></div>
      </div>
      <BottomNav />
    </div>
  );
}
