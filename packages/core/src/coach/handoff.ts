import {
  HandoffSchema,
  type Alert,
  type Crew,
  type DailyReading,
  type Forecast,
  type Handoff,
  type HandoffFacts,
} from '../domain/schemas';
import { handoffText } from '../copy/engineText';
import { indexByDay } from '../engine/baseline';
import { thresholds as defaults, type Thresholds } from '../engine/thresholds';
import { copy } from '../copy/copy';
import { coachActions, rankAlerts } from './coach';

// SBAR handoff (REQ-009): what the crew sends the flight surgeon when the link returns (AOS).
// Situation, Background, Assessment, Recommendation, built only from the engine's alerts and
// forecast plus the coach rules. It never diagnoses; the surgeon decides.

export const HANDOFF_DISCLAIMER =
  'Decision support only, not a medical device.';
export const GROUND_REVIEW = copy.space.reviewRequested;

// What the alerts and forecast cannot say on their own: when, and how long the blackout was.
export type HandoffContext = {
  id: string;
  createdAt: string; // ISO time the handoff was made (at AOS)
  asOfDay: number; // mission day the alerts and forecast are for
  blackout: { start: string; end: string } | null; // LOS and AOS times, ISO
  heldEntries?: number; // black-box entries held during the blackout and sent at AOS
};

// What the baseline was learned from (it is learned from the first baselineWindow days, then frozen).
function baselineFacts(
  readings: DailyReading[],
  crewId: string,
  asOfDay: number,
  t: Thresholds,
): HandoffFacts['baseline'] {
  const end = Math.min(asOfDay - t.alertDays + 1, t.baselineWindow); // exclusive
  const index = indexByDay(readings, crewId);
  const days = [...index.keys()].filter(d => d >= 0 && d < end);
  return {
    days: days.length,
    learningDays: t.learningDays,
    lastDay: days.length ? Math.max(...days) : null,
  };
}

// Where this crew member's readings up to asOfDay came from, so the handoff names it honestly.
function sourceFact(
  readings: DailyReading[],
  crewId: string,
  asOfDay: number,
): Pick<HandoffFacts, 'source'> {
  const kinds = new Set(
    readings
      .filter(r => r.crewId === crewId && r.day <= asOfDay)
      .map(r => r.source),
  );
  if (kinds.size > 1) return { source: 'mixed' };
  const [only] = kinds;
  return only ? { source: only } : {};
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
  const facts: HandoffFacts = {
    crew,
    asOfDay: ctx.asOfDay,
    state: forecast.state,
    confidence: forecast.confidence,
    alerts: own,
    trending: forecast.trending,
    actions: coachActions(own, forecast).map(a => ({
      alertId: a.alertId,
      metric: a.metric,
    })),
    blackout: ctx.blackout,
    ...(ctx.heldEntries === undefined ? {} : { heldEntries: ctx.heldEntries }),
    ...sourceFact(readings, crew.id, ctx.asOfDay),
    baseline: baselineFacts(readings, crew.id, ctx.asOfDay, t),
  };

  // The stored text is the Space wording of the facts; screens re-word the facts by mode.
  return HandoffSchema.parse({
    id: ctx.id,
    crewId: crew.id,
    createdAt: ctx.createdAt,
    ...handoffText(facts, 'space'),
    evidence: own.map(a => a.id),
    disclaimer: HANDOFF_DISCLAIMER,
    facts,
  });
}
