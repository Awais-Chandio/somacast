import {
  alertText,
  assess,
  capitalize,
  coachActions,
  coachActionText,
  copy,
  forecastReasons,
  indexByDay,
  metricIds,
  metricLabel,
  metrics,
  type Alert,
  type CoachAction,
  type Forecast,
  type MetricId,
  type Mode,
  type SimulationResult,
} from '@somacast/core';

// Model: everything the Today screen draws, already worded and formatted.
// The screen only lays this out; all decisions come from @somacast/core.

export type AlertView = {
  id: string;
  metricLabel: string;
  valueText: string; // "5.1 h"
  usualText: string; // "usual 6.2 h"
  zText: string; // "z -3.1"
  daysText: string; // "3 days in a row"
  severity: Alert['severity'];
  severityWord: string; // "High"
  reason: string;
};

// A coach action: what to do, which alert it comes from, and the illustrative label.
export type ActionView = {
  id: string;
  text: string;
  fromText: string; // "From: Sleep duration alert"
  whenText: string; // "Today" or "Next 72 h"
  label: CoachAction['label'];
};

export type LatestView = {
  metric: MetricId;
  label: string;
  valueText: string; // "62" or "-" when the day is missing
  unit: string;
};

export type TodayView = {
  crewName: string;
  dateLabel: string;
  state: Forecast['state'];
  confidence: Forecast['confidence'];
  reasons: string[];
  alerts: AlertView[];
  actions: ActionView[];
  latest: LatestView[];
};

// Display precision per metric (display only, the engine keeps full values).
const decimals: Record<MetricId, number> = {
  restingHr: 0,
  hrv: 0,
  sleepHours: 1,
  exerciseMin: 0,
  cabinCo2: 1,
  radiationDose: 2,
  psychCheckin: 0,
};

// Math.round first so 2.05 shows as 2.1 (toFixed alone gives 2.0), matching the engine's reason text.
function fmt(metric: MetricId, value: number): string {
  const p = 10 ** decimals[metric];
  return (Math.round(value * p) / p).toFixed(decimals[metric]);
}

const severityWord: Record<Alert['severity'], string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function buildTodayView(
  sim: SimulationResult,
  crewId: string,
  day: number,
  mode: Mode = 'space', // Space / Earth wording; the numbers and states never change
): TodayView {
  const words = copy[mode];
  const crewName = sim.crew.find(c => c.id === crewId)?.name ?? crewId;
  const today = indexByDay(sim.readings, crewId).get(day);
  const { alerts, forecast } = assess(sim.readings, crewId, day);

  return {
    crewName,
    dateLabel: `${capitalize(words.day)} ${day} · ${today?.date ?? 'no data'}`,
    state: forecast.state,
    confidence: forecast.confidence,
    reasons: forecastReasons(forecast, alerts, mode),
    alerts: alerts.map(a => {
      const spec = metrics[a.metric];
      return {
        id: a.id,
        metricLabel: metricLabel(a.metric, words),
        valueText: `${fmt(a.metric, a.value)} ${spec.unit}`,
        usualText: `usual ${fmt(a.metric, a.baseline)} ${spec.unit}`,
        zText: `z ${a.zscore.toFixed(1)}`,
        daysText: `${a.days} ${a.days === 1 ? 'day' : 'days'} in a row`,
        severity: a.severity,
        severityWord: severityWord[a.severity],
        reason: alertText(a, mode),
      };
    }),
    actions: coachActions(alerts, forecast).map(a => {
      const t = coachActionText(a.metric, mode);
      return {
        id: a.id,
        text: t.text,
        fromText: `From: ${t.alertLabel}`,
        whenText: a.when === 'today' ? 'Today' : 'Next 72 h',
        label: a.label,
      };
    }),
    latest: metricIds.map(metric => ({
      metric,
      label: metricLabel(metric, words),
      valueText: today ? fmt(metric, today[metric]) : '-',
      unit: metrics[metric].unit,
    })),
  };
}
