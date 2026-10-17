import { metrics, type MetricId } from './metrics';
import type { DailyReading } from './schemas';

export type Baseline = {
  metric: MetricId;
  mean: number;
  sd: number;
  n: number; // number of days used
};

// Readings of one crew member, looked up by day number.
export type DayIndex = Map<number, DailyReading>;

export function indexByDay(readings: DailyReading[], crewId: string): DayIndex {
  const map: DayIndex = new Map();
  for (const r of readings) if (r.crewId === crewId) map.set(r.day, r);
  return map;
}

// Personal baseline from the days in [fromDay, toDay). Missing days are skipped.
// sd has a floor so a very steady metric (or a rounded 1-5 score) does not make every wobble look huge.
export function computeBaseline(
  index: DayIndex,
  metric: MetricId,
  fromDay: number,
  toDay: number,
): Baseline | null {
  const values: number[] = [];
  for (let d = Math.max(0, fromDay); d < toDay; d++) {
    const r = index.get(d);
    if (r) values.push(r[metric]);
  }
  if (values.length < 2) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, v) => a + (v - mean) ** 2, 0) / (values.length - 1);
  const sd = Math.max(Math.sqrt(variance), metrics[metric].withinSd * 0.5);
  return { metric, mean, sd, n: values.length };
}

export function zScore(value: number, baseline: Baseline): number {
  return (value - baseline.mean) / baseline.sd;
}
