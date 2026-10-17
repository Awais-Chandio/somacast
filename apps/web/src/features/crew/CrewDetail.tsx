import { useCallback } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { metrics } from '@somacast/core';
import {
  fetchIndex,
  fetchNotes,
  fetchReadings,
  sendNote,
  type Note,
} from '../../data/api';
import {
  assessCrew,
  crewName,
  isTestCrew,
  losTimeline,
  rowsToReadings,
  sparklines,
  summarizeCrews,
} from '../../data/ground';
import { count, num, utc, withUnit } from '../../shared/format';
import { useLoad } from '../../shared/useLoad';
import { WeatherStatus } from '../../shared/Weather';
import { LosTimeline } from './LosTimeline';
import { Sparkline } from './Sparkline';
import { UplinkNotes } from './UplinkNotes';

async function loadCrew(client: SupabaseClient, crewId: string) {
  const [index, readingRows, notes] = await Promise.all([
    fetchIndex(client, crewId),
    fetchReadings(client, crewId),
    fetchNotes(client, crewId),
  ]);
  const readings = rowsToReadings(readingRows).get(crewId);
  const assessment = assessCrew(readings);
  return {
    summary: summarizeCrews(index)[0] ?? null,
    readings,
    assessment,
    sparks:
      readings && assessment ? sparklines(readings, assessment.asOfDay) : [],
    received: index.map(r => r.received_at),
    notes,
  };
}

type Props = { client: SupabaseClient; crewId: string; authorId: string };

export function CrewDetail({ client, crewId, authorId }: Props) {
  const load = useCallback(() => loadCrew(client, crewId), [client, crewId]);
  const { state, reload } = useLoad(load);
  const name = crewName(crewId);

  const send = useCallback(
    (text: string) => sendNote(client, crewId, authorId, text),
    [client, crewId, authorId],
  );

  if (isTestCrew(crewId))
    return <p className="muted">Test crews are not shown in the console.</p>;

  return (
    <section aria-labelledby="crew-title">
      <a className="back" href="#/">
        <ArrowLeft size={16} aria-hidden="true" /> All crews
      </a>
      <div className="title-row">
        <h1 id="crew-title">
          {name.toUpperCase()} <span className="title-id">CREW {crewId}</span>
        </h1>
        <button
          className="btn-secondary"
          onClick={reload}
          disabled={state.phase === 'loading'}
        >
          <RefreshCw size={16} aria-hidden="true" /> REFRESH
        </button>
      </div>

      {state.phase === 'loading' && (
        <p className="muted" role="status">
          Loading {name}'s log…
        </p>
      )}
      {state.phase === 'error' && (
        <p className="error" role="alert">
          Could not load this crew: {state.error}
        </p>
      )}
      {state.phase === 'ready' && (
        <CrewBody
          data={state.data}
          name={name}
          now={state.loadedAt}
          onSend={send}
        />
      )}
    </section>
  );
}

type Data = Awaited<ReturnType<typeof loadCrew>>;

function CrewBody({
  data,
  name,
  now,
  onSend,
}: {
  data: Data;
  name: string;
  now: Date;
  onSend: (t: string) => Promise<Note>;
}) {
  const { summary, assessment: a, sparks, readings } = data;
  const alerting = new Set(a?.alerts.map(x => x.metric));
  return (
    <>
      <div className="hero">
        {a ? (
          <>
            <div className="hero-status">
              <WeatherStatus state={a.forecast.state} big />
              <span>
                Next 72 h, as of mission day {a.asOfDay} ({a.asOfDate})
                {a.forecast.confidence === 'low' && (
                  <strong>, low confidence</strong>
                )}
              </span>
            </div>
            <ul className="reasons">
              {a.forecast.reasons.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="muted small">
              Computed in this browser with the Somacast engine from{' '}
              {count(a.readingDays)} synced daily reading
              {a.readingDays === 1 ? '' : 's'} (simulated scenario: {a.scenario}
              ). Not a stored state.
            </p>
          </>
        ) : (
          <p>No daily readings synced yet, so there is no forecast.</p>
        )}
        {summary && (
          <dl className="facts">
            <dt>Last sync</dt>
            <dd>{utc(summary.lastReceived)}</dd>
            <dt>Rows received</dt>
            <dd>{count(summary.rows)}</dd>
            {readings && readings.skipped > 0 && (
              <>
                <dt>Other reading rows</dt>
                <dd>
                  {count(readings.skipped)} (demo backlog, not daily readings)
                </dd>
              </>
            )}
          </dl>
        )}
      </div>

      <h2 className="h3">ALERTS ({a?.alerts.length ?? 0})</h2>
      {!a || a.alerts.length === 0 ? (
        <p className="muted">No alerts as of this day.</p>
      ) : (
        <ul className="alerts">
          {a.alerts.map(al => {
            const spec = metrics[al.metric];
            return (
              <li key={al.id} className={`alert alert-${al.severity}`}>
                <p className="alert-head">
                  <AlertTriangle size={24} aria-hidden="true" />
                  <strong>{spec.label}</strong>
                  <span className="tag">
                    {al.severity === 'high' ? 'High' : 'Medium'}
                  </span>
                </p>
                <dl className="alert-facts">
                  <div>
                    <dt>Value</dt>
                    <dd>{withUnit(al.value, spec.unit, 2)}</dd>
                  </div>
                  <div>
                    <dt>Usual</dt>
                    <dd>{withUnit(al.baseline, spec.unit, 2)}</dd>
                  </div>
                  <div>
                    <dt>z</dt>
                    <dd>{num(al.zscore, 2)}</dd>
                  </div>
                  <div>
                    <dt>Days</dt>
                    <dd>{al.days}</dd>
                  </div>
                </dl>
                <p>{al.reason}</p>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="h3">LAST 14 DAYS (SIMULATED)</h2>
      {sparks.length === 0 ? (
        <p className="muted">No readings to chart yet.</p>
      ) : (
        <>
          <div className="sparks">
            {sparks.map(s => (
              <Sparkline
                key={s.metric}
                spark={s}
                alerting={alerting.has(s.metric)}
              />
            ))}
          </div>
          <details className="table-view">
            <summary>Show these 14 days as a table</summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Day</th>
                    {sparks.map(s => (
                      <th scope="col" key={s.metric}>
                        {metrics[s.metric].label} ({metrics[s.metric].unit})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sparks[0]!.points.map((p, i) => (
                    <tr key={p.day}>
                      <th scope="row">{p.day}</th>
                      {sparks.map(s => {
                        const v = s.points[i]?.value;
                        return (
                          <td key={s.metric}>{v == null ? '-' : num(v)}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}

      <h2 className="h3">LINK TIMELINE</h2>
      <LosTimeline spans={losTimeline(data.received, now)} />

      <h2 className="h3">UPLINK NOTE</h2>
      <UplinkNotes crewName={name} notes={data.notes} onSend={onSend} />
    </>
  );
}
