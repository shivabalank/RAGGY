import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authMessage } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GoogleButton, OrDivider } from './GoogleButton';
import { PasswordInput } from './PasswordInput';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type Errs = Partial<Record<'name' | 'email' | 'password' | 'confirm' | 'form', string>>;

export function SignupForm() {
  const { signUp, signInWithGoogle } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState<Errs>({});
  const [busy, setBusy] = useState<'' | 'signup' | 'google'>('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const run = async (kind: 'signup' | 'google', fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); nav('/dashboard', { replace: true }); }
    catch (e) { setErrors({ form: authMessage(e) }); setBusy(''); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errs = {
      name: f.name.trim() ? undefined : 'Enter your name.',
      email: EMAIL.test(f.email) ? undefined : 'Enter a valid email address.',
      password: f.password.length >= 8 ? undefined : 'Use at least 8 characters.',
      confirm: f.confirm === f.password ? undefined : 'Passwords do not match.',
    };
    setErrors(next);
    if (!Object.values(next).some(Boolean)) run('signup', () => signUp(f.name.trim(), f.email, f.password));
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label="Name" autoComplete="name" placeholder="Your full name" value={f.name} onChange={set('name')} error={errors.name} icon={<User className="h-4 w-4" />} />
      <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com" value={f.email} onChange={set('email')} error={errors.email} icon={<Mail className="h-4 w-4" />} />
      <PasswordInput label="Password" autoComplete="new-password" placeholder="At least 8 characters" value={f.password} onChange={set('password')} error={errors.password} />
      <PasswordInput label="Confirm password" autoComplete="new-password" placeholder="Repeat your password" value={f.confirm} onChange={set('confirm')} error={errors.confirm} />
      {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy === 'signup'} disabled={busy === 'google'}>Create account</Button>
      <OrDivider />
      <GoogleButton label="Continue with Google" loading={busy === 'google'} onClick={() => run('google', signInWithGoogle)} />
    </form>
  );
}
