import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { supabase } from './backend/supabase';
import { SignIn } from './features/auth/SignIn';
import { useSession } from './features/auth/useSession';
import { CrewDetail } from './features/crew/CrewDetail';
import { Overview } from './features/overview/Overview';
import { capitalize } from '@somacast/core';
import { useCopy } from './shared/copy';
import { Shell } from './shared/Shell';
import type { SupabaseClient } from '@supabase/supabase-js';

// #/ = overview, #/crew/C1 = one crew. A hash route needs no server config.
function useRoute(): { crewId: string | null } {
  const read = () => {
    const m = /^#\/crew\/([^/]+)$/.exec(window.location.hash);
    return { crewId: m ? decodeURIComponent(m[1]!) : null };
  };
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export function App() {
  if (!supabase)
    return (
      <Shell>
        <p className="error" role="alert">
          Supabase is not configured. Copy apps/web/.env.example to
          apps/web/.env.
        </p>
      </Shell>
    );
  return <Console client={supabase} />;
}

function Console({ client }: { client: SupabaseClient }) {
  const { state, signIn, signOut } = useSession(client);
  const route = useRoute();
  const { words } = useCopy();

  if (state.phase === 'loading')
    return (
      <Shell>
        <p className="muted" role="status">
          Loading…
        </p>
      </Shell>
    );
  if (state.phase === 'signedOut')
    return (
      <Shell>
        <SignIn busy={state.busy} error={state.error} onSignIn={signIn} />
      </Shell>
    );

  const { me } = state;
  const account = (
    <>
      <span className="account-name">
        {me.displayName ?? me.email},{' '}
        {me.role === 'surgeon' ? words.doctor : words.team}
      </span>
      <button className="btn-link" onClick={signOut}>
        <LogOut size={16} aria-hidden="true" /> SIGN OUT
      </button>
    </>
  );

  if (me.role !== 'surgeon')
    return (
      <Shell account={account}>
        <section className="panel" aria-labelledby="denied-title">
          <h1 id="denied-title">{words.doctors.toUpperCase()} ONLY</h1>
          <p className="lead">Ground console is for {words.doctors}.</p>
          <p>
            {capitalize(words.members)} use the Somacast phone app, which shows
            their own forecast and the notes sent to them.
          </p>
        </section>
      </Shell>
    );

  return (
    <Shell account={account}>
      {route.crewId ? (
        <CrewDetail
          client={client}
          crewId={route.crewId}
          authorId={me.userId}
        />
      ) : (
        <Overview client={client} />
      )}
    </Shell>
  );
}
