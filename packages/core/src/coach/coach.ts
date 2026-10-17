import { metrics, type MetricId } from '../domain/metrics';
import type { Alert, Forecast } from '../domain/schemas';

// Coach rules (REQ-010): at most 3 plain-English crew actions from today's alerts and forecast.
// Rules only, no LLM. Every action names the alert it comes from. Behaviour and scheduling only:
// never a medication, a drug or a dose; the CMO and the flight surgeon decide anything clinical.

export const ILLUSTRATIVE = 'illustrative, expert review required' as const;
export const MAX_COACH_ACTIONS = 3;

export type CoachAction = {
  id: string;
  alertId: string; // the alert this action comes from
  alertLabel: string; // "Sleep duration alert"
  metric: MetricId;
  text: string;
  when: 'today' | 'next 72 h';
  label: typeof ILLUSTRATIVE;
};

// One action per metric. ILLUSTRATIVE wording, expert review required.
export const coachRules: Record<MetricId, string> = {
  sleepHours: 'Protect your next sleep window; ask the CMO about the schedule.',
  restingHr:
    'Recheck resting heart rate at your next morning reading; tell the CMO if it stays high.',
  hrv: 'Keep the next work block lighter if the schedule allows; mention it at your next CMO check-in.',
  exerciseMin:
    'Put your exercise session back on the schedule; ask the CMO if something is in the way.',
  psychCheckin:
    'Take some private time or book a private call with the ground; talk to the CMO if it helps.',
  cabinCo2:
    'Tell the crew and the ground about the CO2 reading; follow the station procedure for cabin air.',
  radiationDose:
    'Follow the station space-weather procedure; ask the CMO about shelter timing.',
};

// Words that would turn a coach action into medication or dosing advice. Any rule text that
// matches is dropped at runtime, so a careless edit to coachRules can never reach the crew.
const MEDICATION =
  /\b(medications?|medicines?|meds|drugs?|pills?|tablets?|capsules?|doses?|dosage|dosing|mg|mcg|ml|milligrams?|prescri\w*|sleeping aids?|melatonin|zolpidem|modafinil|caffeine|stimulants?|sedatives?|ibuprofen|paracetamol|acetaminophen|aspirin|antihistamines?|iodide)\b/i;

export function isMedicationAdvice(text: string): boolean {
  return MEDICATION.test(text);
}

const severityRank: Record<Alert['severity'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

// Most urgent first: high before medium before low, then the larger |z|.
export function rankAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort(
    (a, b) =>
      severityRank[a.severity] - severityRank[b.severity] ||
      Math.abs(b.zscore) - Math.abs(a.zscore),
  );
}

// Up to 3 actions for the forecast's crew member, most urgent alert first. A Storm forecast or a
// high alert makes the action "today"; anything else is "next 72 h". No alert, no action.
export function coachActions(
  alerts: Alert[],
  forecast: Forecast,
  rules: Record<MetricId, string> = coachRules,
): CoachAction[] {
  const out: CoachAction[] = [];
  const seen = new Set<MetricId>();
  for (const a of rankAlerts(
    alerts.filter(x => x.crewId === forecast.crewId),
  )) {
    if (out.length >= MAX_COACH_ACTIONS) break;
    const text = rules[a.metric];
    if (seen.has(a.metric) || !text || isMedicationAdvice(text)) continue;
    seen.add(a.metric);
    out.push({
      id: `${a.id}-action`,
      alertId: a.id,
      alertLabel: `${metrics[a.metric].label} alert`,
      metric: a.metric,
      text,
      when:
        forecast.state === 'storm' || a.severity === 'high'
          ? 'today'
          : 'next 72 h',
      label: ILLUSTRATIVE,
    });
  }
  return out;
}
