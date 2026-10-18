import {
  assess,
  enqueue,
  indexByDay,
  type LogEntry,
  type OutboxStore,
  type MissionData,
} from '@somacast/core';

// Black-box log (REQ-007): what the Today screen showed for one crew member on one day.
// One 'reading' entry plus one 'alert' entry per alert. Ids are stable, so showing the same day
// again produces the same idempotency keys and the outbox ignores the repeat.
// The scenario is part of the id because each scenario is a different simulated mission.
export function blackBoxEntries(
  sim: MissionData,
  scenario: string,
  crewId: string,
  day: number,
): LogEntry[] {
  const base = `${scenario}-${crewId}-${day}`;
  const out: LogEntry[] = [];

  const reading = indexByDay(sim.readings, crewId).get(day);
  if (reading) {
    out.push({
      id: `${base}-reading`,
      crewId,
      timestamp: `${reading.date}T00:00:00.000Z`,
      kind: 'reading',
      payload: { ...reading, scenario },
    });
  }

  for (const a of assess(sim.readings, crewId, day).alerts) {
    out.push({
      id: `${base}-alert-${a.metric}`,
      crewId,
      timestamp: a.createdAt,
      kind: 'alert',
      payload: { ...a, scenario },
    });
  }
  return out;
}

// The whole mission so far: blackBoxEntries for every day 0..throughDay. Same stable ids as a day
// the screen shows, so recording the history and visiting a day never make two entries.
export function missionHistory(
  sim: MissionData,
  scenario: string,
  crewId: string,
  throughDay: number,
): LogEntry[] {
  const out: LogEntry[] = [];
  for (let day = 0; day <= throughDay; day++)
    out.push(...blackBoxEntries(sim, scenario, crewId, day));
  return out;
}

// Writes entries to the outbox in one transaction when the store offers one. Returns how many were
// new: entries already waiting in the outbox are ignored (same key). Entries the ground already has
// may be queued again after a sync; the ground stores each key once (on conflict do nothing).
export function recordHistory(
  store: OutboxStore & { batch?: (fn: () => void) => void },
  entries: LogEntry[],
): number {
  const before = store.pendingCount();
  const write = () => entries.forEach(e => enqueue(store, e));
  if (store.batch) store.batch(write);
  else write();
  return store.pendingCount() - before;
}
