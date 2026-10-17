import { useCallback, useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchMe, type Me } from '../../data/api';

export type Session =
  | { phase: 'loading' }
  | { phase: 'signedOut'; error: string | null; busy: boolean }
  | { phase: 'signedIn'; me: Me };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Who is using the console. Restores a saved session and follows sign-outs.
export function useSession(client: SupabaseClient) {
  const [state, setState] = useState<Session>({ phase: 'loading' });

  useEffect(() => {
    let alive = true;
    fetchMe(client)
      .then(
        me =>
          alive &&
          setState(
            me
              ? { phase: 'signedIn', me }
              : { phase: 'signedOut', error: null, busy: false },
          ),
      )
      .catch(
        e =>
          alive &&
          setState({ phase: 'signedOut', error: message(e), busy: false }),
      );
    const { data } = client.auth.onAuthStateChange(event => {
      if (event === 'SIGNED_OUT' && alive)
        setState({ phase: 'signedOut', error: null, busy: false });
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!/^\S+@\S+\.\S+$/.test(email.trim()) || !password) {
        setState({
          phase: 'signedOut',
          error: 'Enter your email and password.',
          busy: false,
        });
        return;
      }
      setState({ phase: 'signedOut', error: null, busy: true });
      const { error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setState({ phase: 'signedOut', error: error.message, busy: false });
        return;
      }
      try {
        const me = await fetchMe(client);
        setState(
          me
            ? { phase: 'signedIn', me }
            : { phase: 'signedOut', error: 'Sign-in failed.', busy: false },
        );
      } catch (e) {
        await client.auth.signOut();
        setState({ phase: 'signedOut', error: message(e), busy: false });
      }
    },
    [client],
  );

  const signOut = useCallback(async () => {
    setState({ phase: 'signedOut', error: null, busy: false });
    await client.auth.signOut();
  }, [client]);

  return { state, signIn, signOut };
}
