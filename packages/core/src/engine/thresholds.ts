import type { MetricId } from '../domain/metrics';

// All thresholds are ILLUSTRATIVE and need expert review. They are not clinical limits.
export const thresholds = {
  learningDays: 14, // REQ-002: days of history before a baseline is trusted
  baselineWindow: 28, // the baseline is learned from the first 28 days, then frozen, so a slow drift cannot hide itself
  zAlert: 2, // REQ-003: |z| above this in the bad direction ...
  alertDays: 3, // ... for this many days in a row raises an alert
  zHigh: 3, // |z| at or above this makes the alert high severity
  forecastHorizonDays: 3, // 72 h
  trendDays: 7, // days used to fit the trend line for the forecast
  zTrendNow: 2, // a trend only counts if the last 3 days already average this far in the bad direction
  maxMissingLast7: 2, // REQ-005: more missing days than this gives low confidence
} as const;

// Which direction is bad for each metric.
export const badDirection: Record<MetricId, 'high' | 'low'> = {
  restingHr: 'high',
  hrv: 'low',
  sleepHours: 'low',
  exerciseMin: 'low',
  cabinCo2: 'high',
  radiationDose: 'high',
  psychCheckin: 'low',
};

export type Thresholds = typeof thresholds;
