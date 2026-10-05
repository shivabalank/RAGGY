import type { AuthUser } from '../types';

const env = import.meta.env;
const cfg = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** True when the VITE_FIREBASE_* variables are present in frontend/.env. */
export const firebaseEnabled = Boolean(cfg.apiKey);

type FbAuth = typeof import('firebase/auth');
type Cb = (u: AuthUser | null) => void;

const listeners = new Set<Cb>();
let last: AuthUser | null = null;
let ready = false;
let watching = false;
const emit = (u: AuthUser | null) => {
  last = u;
  ready = true;
  listeners.forEach((l) => l(u));
};

// ---- Firebase (SDK is lazy loaded) ----
let sdkP: Promise<{ auth: import('firebase/auth').Auth; m: FbAuth }> | null = null;
const notConfigured = () => Object.assign(new Error('Firebase is not configured'), { code: 'app/not-configured' });
const sdk = () =>
  (sdkP ??= (async () => {
    if (!firebaseEnabled) throw notConfigured();
    const [{ initializeApp }, m] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    return { auth: m.getAuth(initializeApp(cfg)), m };
  })());
const mapUser = (u: import('firebase/auth').User): AuthUser => ({
  uid: u.uid,
  name: u.displayName || u.email?.split('@')[0] || 'User',
  email: u.email || '',
  photoURL: u.photoURL || undefined,
});

export const authService = {
  onChange(cb: Cb) {
    listeners.add(cb);
    if (ready) cb(last);
    if (!firebaseEnabled) { if (!ready) emit(null); }
    else if (!watching) {
      watching = true;
      sdk().then(({ auth, m }) => m.onAuthStateChanged(auth, (u) => emit(u ? mapUser(u) : null)));
    }
    return () => { listeners.delete(cb); };
  },
  async signIn(email: string, password: string) {
    const { auth, m } = await sdk();
    await m.signInWithEmailAndPassword(auth, email, password);
  },
  async signUp(name: string, email: string, password: string) {
    const { auth, m } = await sdk();
    const c = await m.createUserWithEmailAndPassword(auth, email, password);
    await m.updateProfile(c.user, { displayName: name });
    emit(mapUser(c.user));
  },
  async google() {
    const { auth, m } = await sdk();
    await m.signInWithPopup(auth, new m.GoogleAuthProvider());
  },
  async resetPassword(email: string) {
    const { auth, m } = await sdk();
    await m.sendPasswordResetEmail(auth, email);
  },
  async signOut() {
    const { auth, m } = await sdk();
    await m.signOut(auth);
  },
  async updateName(name: string) {
    const { auth, m } = await sdk();
    if (auth.currentUser) { await m.updateProfile(auth.currentUser, { displayName: name }); emit(mapUser(auth.currentUser)); }
  },
  async getToken(): Promise<string | undefined> {
    if (!firebaseEnabled) return undefined;
    const { auth } = await sdk();
    return auth.currentUser?.getIdToken();
  },
};
