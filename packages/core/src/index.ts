// Public API of @somacast/core. Apps import only from here, never from inner folders.

// domain: what a crew member, a reading, an alert and a forecast are
export * from './domain/metrics';
export * from './domain/schemas';

// simulation: seeded, clearly simulated crew data
export { createRng, type Rng } from './simulation/rng';
export {
  simulate,
  effectDelta,
  type SimulationOptions,
  type SimulationResult,
} from './simulation/simulator';
export { scenarios } from './simulation/scenarios';

// engine: baseline, anomalies, 72 h forecast (rules only, no LLM)
export { thresholds, badDirection, type Thresholds } from './engine/thresholds';
export {
  computeBaseline,
  indexByDay,
  zScore,
  type Baseline,
  type DayIndex,
} from './engine/baseline';
export { detectAnomalies, baselineFor } from './engine/anomaly';
export { assess, type Assessment } from './engine/forecast';

// sync: black-box outbox that holds everything during LOS and sends it at AOS
export {
  MemoryOutboxStore,
  MockGroundStore,
  idempotencyKey,
  enqueue,
  flushOutbox,
  mockTransport,
  isLinkUp,
  type OutboxItem,
  type OutboxStore,
  type Transport,
  type FlushResult,
} from './sync/outbox';

// design: brand tokens shared by mobile and web
export * from './design/tokens';
export { contrastRatio } from './design/contrast';
