import { AlertTriangle, ArrowDown, FileText } from 'lucide-react';
import {
  alertDomId,
  type EvidenceItem,
  type LoggedHandoff,
} from '../../data/ground';
import { utc } from '../../shared/format';
import { WeatherStatus } from '../../shared/Weather';

const SBAR = [
  ['S', 'Situation', 'situation'],
  ['B', 'Background', 'background'],
  ['A', 'Assessment', 'assessment'],
  ['R', 'Recommendation', 'recommendation'],
] as const;

// Moves to an alert card on this page and gives it keyboard focus (the URL hash is the router's).
function showAlert(alertId: string) {
  const el = document.getElementById(alertDomId(alertId));
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus({ preventScroll: true });
}

type Props = { logged: LoggedHandoff | null; evidence: EvidenceItem[] };

// The newest SBAR handoff from the crew, at the top of the crew page. Text is plain text, as the
// phone's rules wrote it; React escapes it.
export function HandoffPanel({ logged, evidence }: Props) {
  if (!logged)
    return (
      <section className="handoff" aria-labelledby="handoff-title">
        <h2 id="handoff-title" className="h3">
          <FileText size={24} aria-hidden="true" /> LATEST SBAR HANDOFF
        </h2>
        <p className="muted">
          No handoff received yet. The crew's phone sends one at each AOS.
        </p>
      </section>
    );

  const h = logged.handoff;
  return (
    <section className="handoff" aria-labelledby="handoff-title">
      <div className="handoff-head">
        <h2 id="handoff-title" className="h3">
          <FileText size={24} aria-hidden="true" /> LATEST SBAR HANDOFF
        </h2>
        {logged.state && <WeatherStatus state={logged.state} />}
      </div>
      <p className="muted small">
        Made at AOS {utc(h.createdAt)}, received {utc(logged.receivedAt)}
      </p>

      <dl className="sbar">
        {SBAR.map(([letter, name, field]) => (
          <div key={field}>
            <dt>
              <span className="sbar-letter" aria-hidden="true">
                {letter}
              </span>
              {name}
            </dt>
            <dd>{h[field]}</dd>
          </div>
        ))}
      </dl>

      <h3>EVIDENCE ({evidence.length})</h3>
      {evidence.length === 0 ? (
        <p className="muted">No alerts attached.</p>
      ) : (
        <ul className="evidence">
          {evidence.map(e => (
            <li key={e.alertId}>
              <p className="evidence-head">
                <AlertTriangle size={16} aria-hidden="true" />
                <strong>{e.label}</strong>
                {e.severity && (
                  <span className="tag">
                    {e.severity === 'high' ? 'High' : 'Medium'}
                  </span>
                )}
                {e.onPage ? (
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => showAlert(e.alertId)}
                    aria-label={`Show the ${e.label} alert below`}
                  >
                    <ArrowDown size={16} aria-hidden="true" /> SHOW ALERT
                  </button>
                ) : (
                  <span className="muted small">
                    not in this page's alert list
                  </span>
                )}
              </p>
              {e.reason ? (
                <p className="small">{e.reason}</p>
              ) : (
                <p className="muted small">
                  Alert {e.alertId} has not been received.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="muted small">
        {h.disclaimer} Severity comes from the engine's rules; the flight
        surgeon decides.
      </p>
    </section>
  );
}
