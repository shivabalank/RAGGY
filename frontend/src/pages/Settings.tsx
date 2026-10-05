import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Monitor, Moon, Sun } from 'lucide-react';
import { Header } from '../components/dashboard/Header';
import { Avatar } from '../components/dashboard/Sidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { APP_NAME, APP_VERSION } from '../config';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft sm:p-6"><h2 className="mb-4 text-base font-semibold">{title}</h2>{children}</section>
);

export default function Settings() {
  const { user, updateName, signOut } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const themes = [{ id: 'light', label: 'Light', icon: Sun, on: true }, { id: 'dark', label: 'Dark', icon: Moon, on: false }, { id: 'system', label: 'System', icon: Monitor, on: false }];

  const save = async () => { setSaving(true); await updateName(name.trim()); setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  return (
    <>
      <Header title="Settings" />
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6 sm:px-6">
        <Section title="Profile">
          <div className="mb-5 flex items-center gap-4"><Avatar name={user?.name ?? 'User'} src={user?.photoURL} size={64} /><div><p className="font-semibold">{user?.name}</p><p className="text-sm text-zinc-500">Profile image is managed by your sign-in provider.</p></div></div>
          <div className="space-y-4">
            <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" value={user?.email ?? ''} disabled />
            <div className="flex items-center gap-3"><Button onClick={save} loading={saving} disabled={!name.trim() || name === user?.name}>Save changes</Button>{saved && <span className="text-sm text-emerald-600">Saved</span>}</div>
          </div>
        </Section>
        <Section title="Appearance">
          <div className="grid grid-cols-3 gap-2">
            {themes.map(({ id, label, icon: Icon, on }) => (
              <button key={id} disabled={!on} aria-pressed={on} className={cn('flex flex-col items-center gap-1.5 rounded-xl border p-3 text-sm font-medium', on ? 'border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-100' : 'border-zinc-200 text-zinc-400')}>
                <Icon className="h-5 w-5" />{label}{!on && <span className="text-[11px] font-normal">Coming soon</span>}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Account">
          <Button variant="secondary" icon={<LogOut className="h-4 w-4" />} onClick={async () => { await signOut(); nav('/login'); }}>Log out</Button>
        </Section>
        <Section title="Application">
          <dl className="divide-y divide-zinc-100 text-sm">
            <div className="flex justify-between py-2.5"><dt className="text-zinc-500">About</dt><dd className="font-medium">{APP_NAME} · RAG Document Assistant</dd></div>
            <div className="flex justify-between py-2.5"><dt className="text-zinc-500">Version</dt><dd className="font-medium">{APP_VERSION}</dd></div>
          </dl>
        </Section>
      </div>
    </>
  );
}
