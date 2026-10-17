import { metricIds, metrics, type MetricId } from '../domain/metrics';
import type { Alert, DailyReading } from '../domain/schemas';
import {
  badDirection,
  thresholds as defaults,
  type Thresholds,
} from './thresholds';
import {
  computeBaseline,
  indexByDay,
  zScore,
  type Baseline,
  type DayIndex,
} from './baseline';

// Positive "badness": how far past baseline in the bad direction.
function badZ(metric: MetricId, z: number): number {
  return badDirection[metric] === 'high' ? z : -z;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

// Anchored baseline: learned from the first baselineWindow days (never from the days being checked), then frozen.
// Like taking a tailor's measurements once: a slow change later still shows up against them.
// Re-baselining (for example by the flight surgeon) is future work.
export function baselineFor(
  index: DayIndex,
  metric: MetricId,
  asOfDay: number,
  t: Thresholds = defaults,
): Baseline | null {
  const streakStart = asOfDay - t.alertDays + 1;
  const b = computeBaseline(
    index,
    metric,
    0,
    Math.min(streakStart, t.baselineWindow),
  );
  if (!b || b.n < t.learningDays) return null; // still learning
  return b;
}

// REQ-003/004: alert when a metric is past zAlert in the bad direction for alertDays days in a row.
// Every alert carries metric, value, baseline, z, days and a plain-English reason.
export function detectAnomalies(
  readings: DailyReading[],
  crewId: string,
  asOfDay: number,
  t: Thresholds = defaults,
): Alert[] {
  const index = indexByDay(readings, crewId);
  const today = index.get(asOfDay);
  if (!today) return [];
  const alerts: Alert[] = [];

  for (const metric of metricIds) {
    const baseline = baselineFor(index, metric, asOfDay, t);
    if (!baseline) continue;

    let streak = 0;
    for (let d = asOfDay; d > asOfDay - t.alertDays; d--) {
      const r = index.get(d);
      if (!r || badZ(metric, zScore(r[metric], baseline)) <= t.zAlert) break;
      streak++;
    }
    if (streak < t.alertDays) continue;

    const value = today[metric];
    const z = zScore(value, baseline);
    const spec = metrics[metric];
    const word = badDirection[metric] === 'high' ? 'above' : 'below';
    alerts.push({
      id: `${crewId}-${metric}-${today.date}`,
      crewId,
      metric,
      value,
      baseline: Math.round(baseline.mean * 100) / 100,
      zscore: Math.round(z * 100) / 100,
      days: streak,
      reason: `${spec.label} ${fmt(value)} ${spec.unit} is ${word} the usual ${fmt(baseline.mean)} ${spec.unit} for ${streak} days in a row (z ${z.toFixed(1)}).`,
      severity: Math.abs(z) >= t.zHigh ? 'high' : 'medium',
      createdAt: `${today.date}T12:00:00Z`,
    });
  }
  return alerts;
}
