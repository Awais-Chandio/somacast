import { useCallback, useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  errorText,
  loadAccount,
  signInProblem,
  signInWithPassword,
  type Account,
} from '../model/account';

export type AuthState =
  | { phase: 'loading' } // reading a saved session
  | { phase: 'signedOut'; error: string | null; busy: boolean }
  | { phase: 'signedIn'; account: Account }
  | { phase: 'offline' }; // no account: demo ground only

// Controller: who is using the phone. `client` is null when the app has no Supabase .env;
// then only the offline demo is available.
export function useAuth(client: SupabaseClient | null) {
  const [state, setState] = useState<AuthState>(
    client
      ? { phase: 'loading' }
      : { phase: 'signedOut', error: null, busy: false },
  );
  const busy = useRef(false);

  // Restore a saved session on launch, and follow sign-outs (including an expired refresh token).
  useEffect(() => {
    if (!client) return;
    let alive = true;
    client.auth
      .getSession()
      .then(async ({ data }) => {
        const account = data.session
          ? await loadAccount(client, data.session.user)
          : null;
        if (!alive) return;
        setState(
          account
            ? { phase: 'signedIn', account }
            : { phase: 'signedOut', error: null, busy: false },
        );
      })
      .catch(e => {
        if (alive)
          setState({ phase: 'signedOut', error: errorText(e), busy: false });
      });
    // Supabase warns against awaiting its own calls inside this callback, so it only sets state.
    const { data } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' && alive)
        setState(s =>
          s.phase === 'offline'
            ? s
            : { phase: 'signedOut', error: null, busy: false },
        );
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (busy.current) return; // ref: blocks a fast double tap
      const problem = !client
        ? 'Supabase is not configured on this build.'
        : signInProblem(email, password);
      if (problem || !client) {
        setState({ phase: 'signedOut', error: problem, busy: false });
        return;
      }
      busy.current = true;
      setState({ phase: 'signedOut', error: null, busy: true });
      try {
        const account = await signInWithPassword(client, email, password);
        setState({ phase: 'signedIn', account });
      } catch (e) {
        setState({ phase: 'signedOut', error: errorText(e), busy: false });
      } finally {
        busy.current = false;
      }
    },
    [client],
  );

  const signOut = useCallback(async () => {
    setState({ phase: 'signedOut', error: null, busy: false });
    await client?.auth.signOut();
  }, [client]);

  const continueOffline = useCallback(() => setState({ phase: 'offline' }), []);
  const leaveOffline = useCallback(
    () => setState({ phase: 'signedOut', error: null, busy: false }),
    [],
  );

  return { state, signIn, signOut, continueOffline, leaveOffline };
}

export type AuthController = ReturnType<typeof useAuth>;
