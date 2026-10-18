import { z } from 'zod';
import { metricIds } from './metrics';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');
const isoDateTime = z.string().min(10);

export const MetricIdSchema = z.enum(metricIds);

export const CrewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

// Where a reading came from. Every reading says so, and a screen labels it by this field.
export const sourceKinds = [
  'simulated',
  'imported',
  'manual',
  'device',
] as const;
export const SourceKindSchema = z.enum(sourceKinds);

const ReadingFieldsSchema = z.object({
  crewId: z.string().min(1),
  day: z.number().int().min(0),
  date: isoDate,
  restingHr: z.number().min(0),
  hrv: z.number().min(0),
  sleepHours: z.number().min(0),
  exerciseMin: z.number().min(0),
  cabinCo2: z.number().min(0),
  radiationDose: z.number().min(0),
  psychCheckin: z.number().int().min(1).max(5),
  source: SourceKindSchema,
});

// Readings synced before the source field existed carry `simulated: true` instead (they are
// stored on the ground for good). Those, and only those, are read as source 'simulated'.
function legacySimulated(value: unknown): unknown {
  if (typeof value !== 'object' || value === null) return value;
  const { simulated, ...rest } = value as Record<string, unknown>;
  if (simulated === true && !('source' in rest))
    return { ...rest, source: 'simulated' };
  return value;
}

export const ReadingSchema = z.preprocess(legacySimulated, ReadingFieldsSchema);

export const EffectSchema = z
  .object({
    metric: MetricIdSchema,
    crew: z.union([z.literal('all'), z.array(z.string().min(1)).min(1)]),
    startDay: z.number().int().min(0),
    endDay: z.number().int().min(0),
    kind: z.enum(['ramp', 'step']),
    delta: z.number(),
  })
  .refine(e => e.endDay >= e.startDay, {
    message: 'endDay must be >= startDay',
  });

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
  trending: z.array(MetricIdSchema), // metrics projected past the alert line within 72 h (not yet alerting)
});

export const LogEntrySchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  timestamp: isoDateTime,
  kind: z.enum(['reading', 'alert', 'crew_action', 'link_state']),
  payload: z.record(z.string(), z.unknown()),
});

// The structured facts a handoff's text is written from, so a screen can word it in either mode
// (copy/engineText.ts). The stored text stays in Space wording.
export const HandoffFactsSchema = z.object({
  crew: CrewSchema,
  asOfDay: z.number().int().min(0),
  state: ForecastSchema.shape.state,
  confidence: ForecastSchema.shape.confidence,
  alerts: z.array(AlertSchema), // this crew member's alerts, most urgent first
  trending: z.array(MetricIdSchema),
  actions: z.array(
    z.object({ alertId: z.string().min(1), metric: MetricIdSchema }),
  ),
  blackout: z.object({ start: isoDateTime, end: isoDateTime }).nullable(),
  heldEntries: z.number().int().min(0).optional(),
  // Where this crew member's readings came from; 'mixed' for more than one source. Absent on
  // handoffs made before readings carried a source (those were all simulated).
  source: z.enum([...sourceKinds, 'mixed']).optional(),
  baseline: z.object({
    days: z.number().int().min(0), // days the baseline was learned from
    learningDays: z.number().int().min(1), // days needed before it is trusted
    lastDay: z.number().int().min(0).nullable(), // last day it was learned from
  }),
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
  facts: HandoffFactsSchema.optional(), // absent on handoffs made before Earth-mode rewording
});

export const UplinkNoteSchema = z.object({
  id: z.string().min(1),
  crewId: z.string().min(1),
  createdAt: isoDateTime,
  author: z.string().min(1),
  text: z.string().min(1),
});

// A signed-in account (Supabase profiles row). Crew accounts belong to exactly one crew;
// a flight surgeon has no crew and reads every crew's log.
export const ProfileSchema = z
  .object({
    userId: z.string().min(1),
    role: z.enum(['crew', 'surgeon']),
    crewId: z.string().min(1).nullable(),
    displayName: z.string().nullable(),
  })
  .refine(p => p.role !== 'crew' || p.crewId !== null, {
    message: 'a crew account needs a crew_id',
  });

export type SourceKind = z.infer<typeof SourceKindSchema>;
export type Crew = z.infer<typeof CrewSchema>;
export type DailyReading = z.infer<typeof ReadingSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Alert = z.infer<typeof AlertSchema>;
export type Forecast = z.infer<typeof ForecastSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type HandoffFacts = z.infer<typeof HandoffFactsSchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type UplinkNote = z.infer<typeof UplinkNoteSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
