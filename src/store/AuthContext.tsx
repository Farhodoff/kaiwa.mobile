import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { SessionUser, getCurrentUser, signIn, signUp, signOut } from '../services/auth';
import {
  OAuthProvider,
  OAuthResult,
  consumeOAuthPending,
  signInWithOAuth,
} from '../services/oauth';

type AuthState = {
  /** null = still restoring the session. */
  user: SessionUser | null;
  initializing: boolean;
  /**
   * True right after a restored session belongs to an account created via
   * OAuth moments ago — the navigator should start at onboarding.
   */
  pendingOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signInWithProvider: (provider: OAuthProvider) => Promise<OAuthResult>;
  signOut: () => Promise<void>;
  setUser: (u: SessionUser | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [pendingOnboarding, setPendingOnboarding] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const u = await getCurrentUser();
      // Web OAuth returns via a full page reload — check whether the restored
      // session belongs to a brand new account so onboarding still runs.
      const needsOnboarding = u ? await consumeOAuthPending() : false;
      if (!alive) return;
      setUser(u);
      setPendingOnboarding(needsOnboarding);
      setInitializing(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const doSignIn = useCallback(async (email: string, password: string) => {
    const res = await signIn(email, password);
    if (res.ok && res.user) {
      setUser(res.user);
      setPendingOnboarding(false);
    }
    return { ok: res.ok, error: res.error };
  }, []);

  const doSignUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const res = await signUp(email, password, name);
      if (res.ok && res.user && !res.error) {
        setUser(res.user);
        setPendingOnboarding(false);
      }
      return { ok: res.ok, error: res.error };
    },
    [],
  );

  const doSignInWithProvider = useCallback(async (provider: OAuthProvider) => {
    const res = await signInWithOAuth(provider);
    if (res.ok && res.user) {
      setUser(res.user);
      setPendingOnboarding(!!res.isNew);
    }
    return { ok: res.ok, isNew: res.isNew, error: res.error };
  }, []);

  const doSignOut = useCallback(async () => {
    await signOut();
    setUser(null);
    setPendingOnboarding(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      initializing,
      pendingOnboarding,
      signIn: doSignIn,
      signUp: doSignUp,
      signInWithProvider: doSignInWithProvider,
      signOut: doSignOut,
      setUser,
    }),
    [user, initializing, pendingOnboarding, doSignIn, doSignUp, doSignInWithProvider, doSignOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
