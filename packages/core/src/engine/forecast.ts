import { metricIds, metrics, type MetricId } from '../domain/metrics';
import type { Alert, DailyReading, Forecast } from '../domain/schemas';
import {
  badDirection,
  thresholds as defaults,
  type Thresholds,
} from './thresholds';
import { indexByDay, zScore } from './baseline';
import { baselineFor, detectAnomalies } from './anomaly';
import { forecastReasons } from '../copy/engineText';

// Least-squares slope and intercept for points (x, y).
function fitLine(
  points: Array<[number, number]>,
): { slope: number; intercept: number } | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((a, p) => a + p[0], 0) / n;
  const my = points.reduce((a, p) => a + p[1], 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of points) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

export type Assessment = {
  alerts: Alert[];
  forecast: Forecast;
};

// 72 h "body weather" for one crew member (REQ-005).
// Storm:  a high personal alert, or 2+ personal alerts.
// Cloudy: any personal alert, any cabin (environment) alert, or a trend projected past the alert line within 72 h.
// Clear:  none of the above.
// Confidence is low with under learningDays of history or too many missing days in the last 7.
export function assess(
  readings: DailyReading[],
  crewId: string,
  asOfDay: number,
  t: Thresholds = defaults,
): Assessment {
  const index = indexByDay(readings, crewId);
  const today = index.get(asOfDay);
  const date = today?.date ?? 'unknown';
  const alerts = detectAnomalies(readings, crewId, asOfDay, t);

  const personal = alerts.filter(a => metrics[a.metric].scope === 'personal');
  const cabin = alerts.filter(a => metrics[a.metric].scope === 'environment');

  // Trend projection for metrics that are not already alerting.
  const trending: MetricId[] = [];
  for (const metric of metricIds) {
    if (alerts.some(a => a.metric === metric)) continue;
    const baseline = baselineFor(index, metric, asOfDay, t);
    if (!baseline) continue;
    const pts: Array<[number, number]> = [];
    for (let d = asOfDay - t.trendDays + 1; d <= asOfDay; d++) {
      const r = index.get(d);
      if (r) pts.push([d, r[metric]]);
    }
    const line = fitLine(pts);
    if (!line) continue;
    const sign = badDirection[metric] === 'high' ? 1 : -1;
    const projected =
      line.intercept + line.slope * (asOfDay + t.forecastHorizonDays);
    const badProjected = sign * zScore(projected, baseline);
    const last3 = pts.slice(-3).map(p => sign * zScore(p[1], baseline));
    const badNow = last3.reduce((a, b) => a + b, 0) / Math.max(1, last3.length);
    if (badProjected > t.zAlert && badNow > t.zTrendNow) {
      trending.push(metric);
    }
  }

  let state: Forecast['state'] = 'clear';
  if (personal.some(a => a.severity === 'high') || personal.length >= 2)
    state = 'storm';
  else if (personal.length > 0 || cabin.length > 0 || trending.length > 0)
    state = 'cloudy';

  let missing = 0;
  for (let d = asOfDay - 6; d <= asOfDay; d++)
    if (d >= 0 && !index.has(d)) missing++;
  const historyDays = [...index.keys()].filter(d => d <= asOfDay).length;
  const lowConfidence =
    historyDays < t.learningDays || missing > t.maxMissingLast7;
  const confidence: Forecast['confidence'] = lowConfidence ? 'low' : 'normal';

  return {
    alerts,
    forecast: {
      crewId,
      generatedAt: `${date}T12:00:00Z`,
      horizonHours: 72,
      state,
      confidence,
      // Stored in Space wording; screens re-word from state, confidence, trending and the alerts.
      reasons: forecastReasons({ state, confidence, trending }, alerts),
      trending,
    },
  };
}
