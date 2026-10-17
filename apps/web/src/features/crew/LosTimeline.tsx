import { Radio, RadioOff } from 'lucide-react';
import {
  formatDuration,
  LOS_GAP_MS,
  type ContactSpan,
} from '../../data/ground';
import { useCopy } from '../../shared/copy';
import { utc } from '../../shared/format';

const ms = (s: ContactSpan) => Date.parse(s.to) - Date.parse(s.from);

// When rows arrived (contact) and when nothing arrived (LOS gap), from first row to now.
export function LosTimeline({ spans }: { spans: ContactSpan[] }) {
  const { words } = useCopy();
  if (spans.length === 0)
    return (
      <p className="muted">No rows received from this {words.team} yet.</p>
    );
  const total = spans.reduce((a, s) => a + ms(s), 0) || 1;
  const gaps = spans.filter(s => s.kind === 'gap');
  return (
    <div>
      <div className="timeline" aria-hidden="true">
        {spans.map((s, i) => (
          <span
            key={i}
            className={`tl-${s.kind}`}
            style={{ flexGrow: Math.max(ms(s) / total, 0.01) }}
            title={`${s.kind === 'gap' ? words.linkGap : 'Contact'} ${utc(s.from)} to ${utc(s.to)}`}
          />
        ))}
      </div>
      <div className="tl-axis muted small" aria-hidden="true">
        <span>{utc(spans[0]!.from)}</span>
        <span>now</span>
      </div>
      <ul className="tl-list">
        {spans.map((s, i) =>
          s.kind === 'contact' ? (
            <li key={i}>
              <Radio size={16} aria-hidden="true" className="ic-contact" />
              <span>
                <strong>Contact</strong> {utc(s.from)}
                {s.to !== s.from ? ` to ${utc(s.to)}` : ''},{' '}
                {s.rows.toLocaleString('en-US')} rows received
              </span>
            </li>
          ) : (
            <li key={i}>
              <RadioOff size={16} aria-hidden="true" className="ic-gap" />
              <span>
                <strong>
                  {words.linkGap} {formatDuration(ms(s))}
                </strong>
                , no rows received
                {s.open
                  ? ` since ${utc(s.from)} (still open)`
                  : ` from ${utc(s.from)} to ${utc(s.to)}`}
              </span>
            </li>
          ),
        )}
      </ul>
      <p className="muted small">
        A gap is {LOS_GAP_MS / 60000} min or more with no row received
        (illustrative). {gaps.length} gap
        {gaps.length === 1 ? '' : 's'}.
      </p>
    </div>
  );
}
