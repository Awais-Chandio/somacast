import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuth, type AuthController } from './useAuth';
import {
  groundChoiceFor,
  rememberGroundChoice,
} from '../../link/model/groundChoice';

// A fake supabase-js client: one demo user, a profiles table, and an auth event hook.
function fakeClient(opts: { session?: boolean; profile?: object | null } = {}) {
  const user = { id: 'u-maya', email: 'maya@somacast.test' };
  const profile =
    opts.profile === undefined
      ? { role: 'crew', crew_id: 'C1', display_name: 'Maya' }
      : opts.profile;
  let listener: ((event: string) => void) | null = null;
  const signOut = jest.fn(async () => {
    listener?.('SIGNED_OUT');
    return { error: null };
  });
  const client = {
    auth: {
      getSession: async () => ({
        data: { session: opts.session ? { user } : null },
        error: null,
      }),
      signInWithPassword: async ({ password }: { password: string }) =>
        password === 'right'
          ? { data: { user }, error: null }
          : {
              data: { user: null },
              error: { message: 'Invalid login credentials' },
            },
      signOut,
      onAuthStateChange: (cb: (event: string) => void) => {
        listener = cb;
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: profile, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  return { client, signOut };
}

async function renderAuth(client: SupabaseClient | null) {
  const ref: { current: AuthController | null } = { current: null };
  function Probe() {
    ref.current = useAuth(client);
    return null;
  }
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
  return () => ref.current as AuthController;
}

const act = (fn: () => Promise<void> | void) =>
  ReactTestRenderer.act(async () => {
    await fn();
  });

describe('useAuth', () => {
  it('without a backend: signed out, and offline demo is available', async () => {
    const a = await renderAuth(null);
    expect(a().state).toEqual({ phase: 'signedOut', error: null, busy: false });
    await act(() => a().signIn('maya@somacast.test', 'right'));
    expect(a().state).toMatchObject({
      error: 'Supabase is not configured on this build.',
    });
    await act(() => a().continueOffline());
    expect(a().state).toEqual({ phase: 'offline' });
  });

  it('restores a saved session with its profile', async () => {
    const a = await renderAuth(fakeClient({ session: true }).client);
    expect(a().state).toMatchObject({
      phase: 'signedIn',
      account: { role: 'crew', crewId: 'C1', email: 'maya@somacast.test' },
    });
  });

  it('wrong password: stays signed out with the server message', async () => {
    const a = await renderAuth(fakeClient().client);
    await act(() => a().signIn('maya@somacast.test', 'wrong'));
    expect(a().state).toEqual({
      phase: 'signedOut',
      error: 'Invalid login credentials',
      busy: false,
    });
  });

  it('right password: signed in; sign out returns to the sign-in screen', async () => {
    const { client, signOut } = fakeClient();
    const a = await renderAuth(client);
    await act(() => a().signIn('maya@somacast.test', 'right'));
    expect(a().state).toMatchObject({ phase: 'signedIn' });
    await act(() => a().signOut());
    expect(signOut).toHaveBeenCalled();
    expect(a().state).toEqual({ phase: 'signedOut', error: null, busy: false });
  });

  it('an account without a profile is signed straight back out', async () => {
    const { client, signOut } = fakeClient({ profile: null });
    const a = await renderAuth(client);
    await act(() => a().signIn('maya@somacast.test', 'right'));
    expect(signOut).toHaveBeenCalled();
    expect(a().state).toMatchObject({
      phase: 'signedOut',
      error: 'No profile for this account yet. See supabase/seed-users.md.',
    });
  });

  it('signing in resets that account to the Supabase ground', async () => {
    rememberGroundChoice('u-maya', 'demo'); // picked Demo in an earlier session
    const a = await renderAuth(fakeClient().client);
    await act(() => a().signIn('maya@somacast.test', 'right'));
    expect(a().state).toMatchObject({ phase: 'signedIn' });
    expect(groundChoiceFor('u-maya')).toBe('supabase');
  });
});
