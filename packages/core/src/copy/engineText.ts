import { metrics, type MetricId } from '../domain/metrics';
import type { Alert, Forecast, Handoff, HandoffFacts } from '../domain/schemas';
import { weather } from '../design/tokens';
import { badDirection } from '../engine/thresholds';
import { ILLUSTRATIVE } from '../coach/coach';
import { coachText, copy, metricLabel, type Mode } from './copy';

// Engine sentences, written from structured fields in either wording (REQ-019).
// The engine itself writes the stored log text with mode 'space', so the Space text a screen
// renders is always the stored text. Earth only changes words, never a number or a state.

// Math.round first so 2.05 reads 2.1 (toFixed alone gives 2.0), the same as the phone's alert card.
function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1);
}

// "Sleep duration 4.1 h is below the usual 5.5 h for 3 days in a row (z -2.6)."
export function alertText(alert: Alert, mode: Mode = 'space'): string {
  const spec = metrics[alert.metric];
  const word = badDirection[alert.metric] === 'high' ? 'above' : 'below';
  return `${metricLabel(alert.metric, copy[mode])} ${fmt(alert.value)} ${spec.unit} is ${word} the usual ${fmt(alert.baseline)} ${spec.unit} for ${alert.days} days in a row (z ${alert.zscore.toFixed(1)}).`;
}

export type ForecastFacts = Pick<Forecast, 'state' | 'confidence' | 'trending'>;

// The forecast's "why" list: alert reasons, trends, low confidence, or "all close to usual".
export function forecastReasons(
  forecast: ForecastFacts,
  alerts: Alert[],
  mode: Mode = 'space',
): string[] {
  const words = copy[mode];
  const reasons = alerts.map(a => alertText(a, mode));
  for (const m of forecast.trending)
    reasons.push(
      `${metricLabel(m, words)} is trending ${badDirection[m] === 'high' ? 'up' : 'down'} and may pass the alert line within 72 h.`,
    );
  const low = forecast.confidence === 'low';
  if (low)
    reasons.push(
      'Low confidence: not enough recent data to trust the baseline.',
    );
  if (forecast.state === 'clear' && !low)
    reasons.push(
      `All metrics are close to this ${words.member}'s usual range.`,
    );
  return reasons;
}

// The coach action for one metric, plus the alert it comes from.
export function coachActionText(metric: MetricId, mode: Mode = 'space') {
  return {
    text: coachText[mode][metric],
    alertLabel: `${metricLabel(metric, copy[mode])} alert`,
  };
}

// "3 h 20 min", "45 min", "2 d 4 h", "under 1 min".
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000);
  if (min < 1) return 'under 1 min';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ${min % 60} min`;
  return `${Math.floor(h / 24)} d ${h % 24} h`;
}

const hhmm = (iso: string) => `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;

// The handoff says where the numbers came from. No source = a handoff made before readings
// carried one, when every reading was simulated.
const vitalsSource: Record<NonNullable<HandoffFacts['source']>, string> = {
  simulated: 'All vitals are simulated.',
  imported: 'All vitals were imported from a data file.',
  manual: 'All vitals were entered by hand.',
  device: 'All vitals come from a connected device.',
  mixed: 'Vitals come from more than one source.',
};

export type HandoffText = Pick<
  Handoff,
  'situation' | 'background' | 'assessment' | 'recommendation'
>;

// SBAR text from the handoff's facts. Never diagnoses; the doctor decides.
export function handoffText(
  f: HandoffFacts,
  mode: Mode = 'space',
): HandoffText {
  const words = copy[mode];
  const top = f.alerts[0];
  const low = f.confidence === 'low' ? ' (low confidence)' : '';
  const situation = `${f.crew.name} (${f.crew.id}), ${words.day} ${f.asOfDay}: ${weather[f.state].label} forecast for the next 72 h${low}. ${
    top ? `Top alert: ${alertText(top, mode)}` : 'No active alerts.'
  }`;

  let blackout = words.noBlackout;
  if (f.blackout) {
    const { start, end } = f.blackout;
    const ms = Math.max(0, Date.parse(end) - Date.parse(start));
    const n = f.heldEntries;
    const held =
      n === undefined
        ? ''
        : ` The black box held ${n} log ${n === 1 ? 'entry' : 'entries'} and sent them ${words.atLinkUp}.`;
    blackout = `${words.outOfContact} for ${formatDuration(ms)}, ${hhmm(start)} to ${hhmm(end)}.${held}`;
  }
  const b = f.baseline;
  const baseline =
    b.lastDay === null || b.days < b.learningDays
      ? `Personal baseline still learning (${b.days} of ${b.learningDays} days).`
      : `Personal baseline learned from ${words.day}s 0 to ${b.lastDay} (${b.days} days); ${words.day} ${f.asOfDay} is ${f.asOfDay - b.lastDay} ${f.asOfDay - b.lastDay === 1 ? 'day' : 'days'} after it.`;
  const background = [
    blackout,
    baseline,
    vitalsSource[f.source ?? 'simulated'],
  ].join(' ');

  const assessment = f.alerts.length
    ? f.alerts.map(a => `- ${alertText(a, mode)}`).join('\n')
    : forecastReasons(f, [], mode)
        .map(r => `- ${r}`)
        .join('\n') || '- No alerts.';

  const recommendation = [
    ...f.actions.map(a => {
      const t = coachActionText(a.metric, mode);
      return `- ${t.text} (from: ${t.alertLabel}; ${ILLUSTRATIVE})`;
    }),
    words.reviewRequested,
  ].join('\n');

  return { situation, background, assessment, recommendation };
}

// What a screen shows for a stored handoff. Handoffs made before the facts were stored keep
// their stored (Space) text in both modes.
export function renderHandoff(h: Handoff, mode: Mode = 'space'): HandoffText {
  if (h.facts) return handoffText(h.facts, mode);
  const { situation, background, assessment, recommendation } = h;
  return { situation, background, assessment, recommendation };
}
