import {
  HandoffSchema,
  type Alert,
  type Crew,
  type DailyReading,
  type Forecast,
  type Handoff,
} from '../domain/schemas';
import { weather } from '../design/tokens';
import { indexByDay } from '../engine/baseline';
import { thresholds as defaults, type Thresholds } from '../engine/thresholds';
import { coachActions, rankAlerts } from './coach';

// SBAR handoff (REQ-009): what the crew sends the flight surgeon when the link returns (AOS).
// Situation, Background, Assessment, Recommendation, built only from the engine's alerts and
// forecast plus the coach rules. It never diagnoses; the surgeon decides.

export const HANDOFF_DISCLAIMER =
  'Decision support only, not a medical device.';
export const GROUND_REVIEW = 'Ground review requested.';

// What the alerts and forecast cannot say on their own: when, and how long the blackout was.
export type HandoffContext = {
  id: string;
  createdAt: string; // ISO time the handoff was made (at AOS)
  asOfDay: number; // mission day the alerts and forecast are for
  blackout: { start: string; end: string } | null; // LOS and AOS times, ISO
  heldEntries?: number; // black-box entries held during the blackout and sent at AOS
};

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

function blackoutText(ctx: HandoffContext): string {
  if (!ctx.blackout) return 'No blackout before this handoff.';
  const { start, end } = ctx.blackout;
  const ms = Math.max(0, Date.parse(end) - Date.parse(start));
  const held =
    ctx.heldEntries === undefined
      ? ''
      : ` The black box held ${ctx.heldEntries} log ${ctx.heldEntries === 1 ? 'entry' : 'entries'} and sent them at AOS.`;
  return `Out of contact (LOS) for ${formatDuration(ms)}, ${hhmm(start)} to ${hhmm(end)}.${held}`;
}

// The baseline is learned from the first baselineWindow days and then frozen (see engine/anomaly).
function baselineText(
  readings: DailyReading[],
  crewId: string,
  asOfDay: number,
  t: Thresholds,
): string {
  const end = Math.min(asOfDay - t.alertDays + 1, t.baselineWindow); // exclusive
  const index = indexByDay(readings, crewId);
  const days = [...index.keys()].filter(d => d >= 0 && d < end);
  if (days.length < t.learningDays)
    return `Personal baseline still learning (${days.length} of ${t.learningDays} days).`;
  const last = Math.max(...days);
  const since = asOfDay - last;
  return `Personal baseline learned from mission days 0 to ${last} (${days.length} days); mission day ${asOfDay} is ${since} ${since === 1 ? 'day' : 'days'} after it.`;
}

export function buildHandoff(
  readings: DailyReading[],
  alerts: Alert[],
  forecast: Forecast,
  crew: Crew,
  ctx: HandoffContext,
  t: Thresholds = defaults,
): Handoff {
  const own = rankAlerts(alerts.filter(a => a.crewId === crew.id));
  const top = own[0];
  const word = weather[forecast.state].label;
  const low = forecast.confidence === 'low' ? ' (low confidence)' : '';

  const situation = `${crew.name} (${crew.id}), mission day ${ctx.asOfDay}: ${word} forecast for the next 72 h${low}. ${
    top ? `Top alert: ${top.reason}` : 'No active alerts.'
  }`;

  const background = [
    blackoutText(ctx),
    baselineText(readings, crew.id, ctx.asOfDay, t),
    'All vitals are simulated.',
  ].join(' ');

  const assessment = own.length
    ? own.map(a => `- ${a.reason}`).join('\n')
    : forecast.reasons.map(r => `- ${r}`).join('\n') || '- No alerts.';

  const actions = coachActions(own, forecast);
  const recommendation = [
    ...actions.map(a => `- ${a.text} (from: ${a.alertLabel}; ${a.label})`),
    GROUND_REVIEW,
  ].join('\n');

  return HandoffSchema.parse({
    id: ctx.id,
    crewId: crew.id,
    createdAt: ctx.createdAt,
    situation,
    background,
    assessment,
    recommendation,
    evidence: own.map(a => a.id),
    disclaimer: HANDOFF_DISCLAIMER,
  });
}
