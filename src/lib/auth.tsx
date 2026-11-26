import type { Session } from '@supabase/supabase-js';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from './supabase';

type AuthState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retry: () => void }
  | { status: 'ready'; session: Session };

const AuthContext = createContext<AuthState>({ status: 'loading' });

/**
 * Signs the user in anonymously on first launch (US-0.1) and keeps the session.
 * The session is persisted in AsyncStorage, so the same anonymous user comes back after restarts.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const retry = () => setAttempt((a) => a + 1);

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (active) setState({ status: 'ready', session: data.session });
        return;
      }
      const { data: signIn, error } = await supabase.auth.signInAnonymously();
      if (!active) return;
      if (error || !signIn.session) {
        setState({
          status: 'error',
          message: "We couldn't connect. Check your internet connection and try again.",
          retry,
        });
      } else {
        setState({ status: 'ready', session: signIn.session });
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) setState({ status: 'ready', session });
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [attempt]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
