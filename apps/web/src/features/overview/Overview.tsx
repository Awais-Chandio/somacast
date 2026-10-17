import { useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { RefreshCw } from 'lucide-react';
import { fetchIndex, fetchReadings } from '../../data/api';
import { assessCrew, rowsToReadings, summarizeCrews } from '../../data/ground';
import { count, utc } from '../../shared/format';
import { useLoad } from '../../shared/useLoad';
import { WeatherStatus } from '../../shared/Weather';

// Crew overview: one card per crew found in log_entries. The forecast is recomputed in the
// browser from the synced readings with core assess().
async function loadOverview(client: SupabaseClient) {
  const [index, readingRows] = await Promise.all([
    fetchIndex(client),
    fetchReadings(client),
  ]);
  const readings = rowsToReadings(readingRows);
  return summarizeCrews(index).map(c => ({
    ...c,
    assessment: assessCrew(readings.get(c.crewId)),
  }));
}

export function Overview({ client }: { client: SupabaseClient }) {
  const load = useCallback(() => loadOverview(client), [client]);
  const { state, reload } = useLoad(load);

  return (
    <section aria-labelledby="overview-title">
      <div className="title-row">
        <h1 id="overview-title">CREW OVERVIEW</h1>
        <button
          className="btn-secondary"
          onClick={reload}
          disabled={state.phase === 'loading'}
        >
          <RefreshCw size={16} aria-hidden="true" /> REFRESH
        </button>
      </div>
      <p className="lead">
        72 h body weather per crew member, computed here from the readings each
        crew synced at AOS.
      </p>
      {state.phase === 'loading' && (
        <p className="muted" role="status">
          Loading the black-box log…
        </p>
      )}
      {state.phase === 'error' && (
        <p className="error" role="alert">
          Could not load the log: {state.error}
        </p>
      )}
      {state.phase === 'ready' && state.data.length === 0 && (
        <p className="muted">
          No crew has synced yet. Rows appear here after a crew's first AOS.
        </p>
      )}
      {state.phase === 'ready' && state.data.length > 0 && (
        <ul className="cards">
          {state.data.map(c => (
            <li key={c.crewId}>
              <a
                className="card"
                href={`#/crew/${encodeURIComponent(c.crewId)}`}
              >
                <span className="card-head">
                  <span className="card-name">{c.name}</span>
                  <span className="card-id">Crew {c.crewId}</span>
                </span>
                {c.assessment ? (
                  <span className="card-forecast">
                    <WeatherStatus state={c.assessment.forecast.state} big />
                    <span className="muted small">
                      72 h, as of mission day {c.assessment.asOfDay}
                      {c.assessment.forecast.confidence === 'low'
                        ? ', low confidence'
                        : ''}
                    </span>
                  </span>
                ) : (
                  <span className="card-forecast muted">
                    No daily readings synced yet
                  </span>
                )}
                <dl className="facts">
                  <dt>Last sync</dt>
                  <dd>{utc(c.lastReceived)}</dd>
                  <dt>Rows received</dt>
                  <dd>{count(c.rows)}</dd>
                </dl>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
