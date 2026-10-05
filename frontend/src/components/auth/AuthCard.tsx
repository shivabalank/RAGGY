import { ReactNode } from 'react';
import { Flame } from 'lucide-react';
import { HERO_URL } from '../../config';
import { Logo } from '../Logo';

export function SecuredBadge() {
  return (
    <div className="mt-6 flex flex-col items-center gap-1 border-t border-zinc-100 pt-4 text-xs text-zinc-400">
      <p className="flex items-center gap-1.5"><Flame className="h-3.5 w-3.5 text-amber-500" aria-hidden /> Secured by Firebase</p>
    </div>
  );
}

/** Full-screen hero background + centered card. Desktop: floating card. Mobile: bottom sheet over the hero. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-brand-50 bg-cover bg-[position:50%_0] sm:bg-center" style={{ backgroundImage: `url(${HERO_URL})` }}>
      <div className="flex min-h-[100dvh] items-end justify-center bg-brand-950/[0.04] sm:items-center sm:p-6">
        <main className="mt-[22vh] w-full animate-slide-up rounded-t-3xl border border-white/70 bg-white px-6 pb-6 pt-8 shadow-card sm:mt-0 sm:max-w-[440px] sm:rounded-2xl sm:px-9 sm:py-9">
          <div className="mb-7 flex flex-col items-center text-center">
            <Logo size={44} />
            <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900">{title}</h1>
            <p className="mt-1.5 text-[15px] text-zinc-500">{subtitle}</p>
          </div>
          {children}
          <p className="mt-6 text-center text-sm text-zinc-500">{footer}</p>
          <SecuredBadge />
        </main>
      </div>
    </div>
  );
}
