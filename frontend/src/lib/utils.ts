export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  const kb = b / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
export const initials = (n: string) =>
  n.split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'U';

const AUTH_ERRORS: Record<string, string> = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/weak-password': 'Password must be at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/network-request-failed': 'Network error. Check your connection.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in popup. Allow popups and try again.',
  'auth/cancelled-popup-request': 'Google sign-in was cancelled.',
  'auth/unauthorized-domain': 'This domain is not authorised in Firebase. Add it under Authentication > Settings > Authorized domains.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in the Firebase console.',
  'auth/user-disabled': 'This account has been disabled.',
  'app/not-configured': 'Firebase is not configured. Fill in frontend/.env (VITE_FIREBASE_*) and restart npm run dev.',
};
export const authMessage = (e: unknown) =>
  AUTH_ERRORS[(e as { code?: string })?.code ?? ''] ?? 'Something went wrong. Please try again.';
