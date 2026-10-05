import { NavLink, useNavigate } from 'react-router-dom';
import { FileText, LayoutDashboard, LogOut, MessageSquare, Settings } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { cn, initials } from '../../lib/utils';
import { Logo } from '../Logo';

export const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function Avatar({ name, src, size = 36 }: { name: string; src?: string; size?: number }) {
  return src
    ? <img src={src} alt="" style={{ width: size, height: size }} className="rounded-full object-cover" />
    : <span style={{ width: size, height: size }} className="grid shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">{initials(name)}</span>;
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-brand-950/30 animate-fade-in lg:hidden" onClick={onClose} />}
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center border-b border-zinc-100 px-5"><Logo size={32} /></div>
        <nav className="flex-1 space-y-1 p-3" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn('relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors', isActive ? 'bg-brand-50 text-brand-700 before:absolute before:-left-3 before:top-2 before:bottom-2 before:w-1 before:rounded-r before:bg-brand-600' : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900')}>
              <Icon className="h-[18px] w-[18px]" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={user?.name ?? 'User'} src={user?.photoURL} />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-semibold">{user?.name}</p>
              <p className="truncate text-xs text-zinc-500">{user?.email}</p>
            </div>
            <button onClick={async () => { await signOut(); nav('/login'); }} aria-label="Log out" title="Log out" className="rounded-md p-2 text-zinc-400 hover:bg-brand-50 hover:text-brand-700"><LogOut className="h-4 w-4" /></button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-zinc-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => cn('flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', isActive ? 'text-brand-700' : 'text-zinc-500')}>
          {({ isActive }) => (<><span className={cn('rounded-full px-4 py-1 transition-colors', isActive && 'bg-brand-100')}><Icon className="h-5 w-5" /></span>{label}</>)}
        </NavLink>
      ))}
    </nav>
  );
}
