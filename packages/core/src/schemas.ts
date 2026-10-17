import { z } from 'zod';
import { metricIds } from './metrics';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const isoDateTime = z.string().min(10);

export const MetricIdSchema = z.enum(metricIds);

export const CrewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const ReadingSchema = z.object({
  crewId: z.string().min(1),
  day: z.number().int().min(0),
  date: isoDate,
  restingHr: z.number(),
  hrv: z.number(),
  sleepHours: z.number().min(0),
  exerciseMin: z.number().min(0),
  cabinCo2: z.number().min(0),
  radiationDose: z.number().min(0),
  psychCheckin: z.number().int().min(1).max(5),
  simulated: z.literal(true), // every vital must say it is simulated
});

export const EffectSchema = z
  .object({
    metric: MetricIdSchema,
    crew: z.union([z.literal('all'), z.array(z.string().min(1)).min(1)]),
    startDay: z.number().int().min(0),
    endDay: z.number().int().min(0),
    kind: z.enum(['ramp', 'step']),
    delta: z.number(),
  })
  .refine(e => e.endDay >= e.startDay, { message: 'endDay must be >= startDay' });

export const ScenarioSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  effects: z.array(EffectSchema),
});

// Every alert carries its reason (REQ-004, NFR-002).
export const AlertSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  metric: MetricIdSchema,
  value: z.number(),
  baseline: z.number(),
  zscore: z.number(),
  days: z.number().int().min(1),
  reason: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high']),
  createdAt: isoDateTime,
});

export const ForecastSchema = z.object({
  crewId: z.string().min(1),
  generatedAt: isoDateTime,
  horizonHours: z.literal(72),
  state: z.enum(['clear', 'cloudy', 'storm']),
  confidence: z.enum(['normal', 'low']),
  reasons: z.array(z.string()),
});

export const LogEntrySchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  timestamp: isoDateTime,
  kind: z.enum(['reading', 'alert', 'crew_action', 'link_state']),
  payload: z.record(z.string(), z.unknown()),
});

export const HandoffSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  createdAt: isoDateTime,
  situation: z.string(),
  background: z.string(),
  assessment: z.string(),
  recommendation: z.string(),
  evidence: z.array(z.string()), // alert ids
  disclaimer: z.string().min(1),
});

export const UplinkNoteSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  createdAt: isoDateTime,
  author: z.string().min(1),
  text: z.string().min(1),
});

export type Crew = z.infer<typeof CrewSchema>;
export type DailyReading = z.infer<typeof ReadingSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Forecast = z.infer<typeof ForecastSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type UplinkNote = z.infer<typeof UplinkNoteSchema>;
