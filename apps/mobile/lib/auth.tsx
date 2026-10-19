import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

interface AuthValue {
  session: Session | null;
  /** True until the stored session has been read. */
  loading: boolean;
  /** Each sign-in returns an error message, or null on success. */
  signInWithEmailLink: (email: string) => Promise<string | null>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  /** Creates the account; resolves to a message when the email must be confirmed first. */
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

// basketlog:// in a build, exp://... in Expo Go; both must be listed in the Supabase redirect URLs
export const AUTH_CALLBACK = Linking.createURL('auth/callback');

/** Magic-link redirects carry the session in the URL fragment. */
async function sessionFromUrl(url: string): Promise<void> {
  const fragment = url.split('#')[1];
  if (!fragment) return;
  const params = new URLSearchParams(fragment);
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) await supabase.auth.setSession({ access_token, refresh_token });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    void Linking.getInitialURL().then((url) => (url ? sessionFromUrl(url) : undefined));
    const link = Linking.addEventListener('url', ({ url }) => void sessionFromUrl(url));
    return () => {
      sub.subscription.unsubscribe();
      link.remove();
    };
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      session,
      loading,
      signInWithEmailLink: async (email) =>
        (await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: AUTH_CALLBACK } })).error?.message ?? null,
      signInWithPassword: async (email, password) =>
        (await supabase.auth.signInWithPassword({ email, password })).error?.message ?? null,
      signUp: async (email, password) => {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: AUTH_CALLBACK } });
        return { error: error?.message ?? null, needsConfirmation: !error && !data.session };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
