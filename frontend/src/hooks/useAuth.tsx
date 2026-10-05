import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { authService } from '../services/firebase';
import type { AuthUser } from '../types';

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}
const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => authService.onChange((u) => { setUser(u); setLoading(false); }), []);
  const value = useMemo<AuthCtx>(() => ({
    user, loading,
    signIn: authService.signIn, signUp: authService.signUp, signInWithGoogle: authService.google,
    resetPassword: authService.resetPassword, updateName: authService.updateName, signOut: authService.signOut,
  }), [user, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside <AuthProvider>');
  return c;
}

const Loader = () => (
  <div className="grid min-h-[100dvh] place-items-center bg-brand-50"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
);

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loader />;
  return user ? <Outlet /> : <Navigate to="/login" replace state={{ from: loc }} />;
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth();
  if (loading) return <Loader />;
  return user ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
