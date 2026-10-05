import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authMessage } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { GoogleButton, OrDivider } from './GoogleButton';
import { PasswordInput } from './PasswordInput';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const nav = useNavigate();
  const dest = (useLocation().state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState<'' | 'login' | 'google'>('');

  const run = async (kind: 'login' | 'google', fn: () => Promise<void>) => {
    setBusy(kind); setInfo('');
    try { await fn(); nav(dest, { replace: true }); }
    catch (e) { setErrors({ form: authMessage(e) }); setBusy(''); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = {
      email: EMAIL.test(email) ? undefined : 'Enter a valid email address.',
      password: password ? undefined : 'Enter your password.',
    };
    setErrors(next);
    if (!next.email && !next.password) run('login', () => signIn(email, password));
  };
  const forgot = async () => {
    if (!EMAIL.test(email)) return setErrors({ email: 'Enter your email above, then select Forgot password.' });
    setErrors({});
    try { await resetPassword(email); setInfo(`If an account exists for ${email}, a reset link is on its way.`); }
    catch (e) { setErrors({ form: authMessage(e) }); }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com" value={email}
        onChange={(e) => setEmail(e.target.value)} error={errors.email} icon={<Mail className="h-4 w-4" />} />
      <div>
        <PasswordInput label="Password" autoComplete="current-password" placeholder="Enter your password" value={password}
          onChange={(e) => setPassword(e.target.value)} error={errors.password} />
        <div className="mt-2 text-right">
          <button type="button" onClick={forgot} className="text-sm font-medium text-brand-600 hover:text-brand-800 hover:underline">Forgot password?</button>
        </div>
      </div>
      {errors.form && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.form}</p>}
      {info && <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">{info}</p>}
      <Button type="submit" size="lg" className="w-full" loading={busy === 'login'} disabled={busy === 'google'}>Sign in</Button>
      <OrDivider />
      <GoogleButton label="Continue with Google" loading={busy === 'google'} onClick={() => run('google', signInWithGoogle)} />
    </form>
  );
}
