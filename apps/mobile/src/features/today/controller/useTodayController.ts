import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueue, type OutboxStore } from '@somacast/core';
import {
  DEFAULT_CREW_ID,
  SCENARIO_OPTIONS,
  type DemoMission,
  type ScenarioKey,
} from '../../../config/mission';
import {
  DATA_SOURCE_OPTIONS,
  type DataSourceKey,
} from '../../../config/dataSources';
import {
  lastDay,
  loadMission,
  sourceBadge,
} from '../../../shared/model/missionData';
import {
  blackBoxEntries,
  missionHistory,
  recordHistory,
} from '../../../sync/blackBox';
import { useCopy } from '../../../shared/copy/useCopy';
import { buildTodayView } from '../model/todayModel';

// The day is kept clamped to the last day of the current source; LAST_DAY asks for that day.
const LAST_DAY = Number.MAX_SAFE_INTEGER;

// Controller: owns the Today screen's state and user actions.
// No layout here (that is the view) and no health logic (that is the model / @somacast/core).
// Every day the screen shows is also written to the black-box outbox; onLogged lets the link panel recount.
// A new logEpoch (after a demo reset) logs the day on screen again.
// lockedCrewId: a signed-in crew member sees and logs only their own crew.
// mission (signed in): the account's own scenario (locked) and start day. The black box then records
// the whole mission so far, days 0..mission.day, not only the days the screen visits.
// source: simulated or the imported example CSV. Signed in, it is locked to simulated, so only
// simulated readings ever reach the real ground console.
export function useTodayController(
  outbox: OutboxStore,
  onLogged?: () => void,
  logEpoch = 0,
  lockedCrewId?: string,
  mission?: DemoMission,
) {
  const [chosenSource, setSource] = useState<DataSourceKey>('simulated');
  const source: DataSourceKey = mission ? 'simulated' : chosenSource;
  const [chosenScenario, setScenario] = useState<ScenarioKey>('normal');
  const scenario = mission?.scenario ?? chosenScenario;

  // Everything below works on loaded.data the same way, whatever the source.
  const loaded = useMemo(
    () => loadMission(source, scenario),
    [source, scenario],
  );
  const sim = loaded.data;
  const logKey = loaded.logKey;
  const maxDay = lastDay(sim);

  const [chosenCrewId, setCrewId] = useState(DEFAULT_CREW_ID);
  const crewId =
    lockedCrewId ??
    (sim.crew.some(m => m.id === chosenCrewId)
      ? chosenCrewId
      : sim.crew[0]?.id ?? chosenCrewId);
  const [rawDay, setDay] = useState(() =>
    Math.max(0, mission?.day ?? LAST_DAY),
  );
  const day = Math.min(rawDay, maxDay);

  const { mode } = useCopy();
  const view = useMemo(
    () => buildTodayView(sim, crewId, day, mode),
    [sim, crewId, day, mode],
  );
  const logEntries = useMemo(
    () => blackBoxEntries(sim, logKey, crewId, day),
    [sim, logKey, crewId, day],
  );

  // Signed in: the whole mission so far, once per account screen and again after a demo reset.
  const historyThrough = mission ? Math.min(maxDay, mission.day) : null;
  useEffect(() => {
    if (historyThrough === null) return;
    recordHistory(outbox, missionHistory(sim, logKey, crewId, historyThrough));
    onLogged?.();
  }, [outbox, sim, logKey, crewId, historyThrough, onLogged, logEpoch]);

  useEffect(() => {
    for (const e of logEntries) enqueue(outbox, e); // same day again = same keys = no-op
    onLogged?.();
  }, [outbox, logEntries, onLogged, logEpoch]);

  const prevDay = useCallback(
    () => setDay(d => Math.max(0, Math.min(d, maxDay) - 1)),
    [maxDay],
  );
  const nextDay = useCallback(
    () => setDay(d => Math.min(maxDay, d + 1)),
    [maxDay],
  );
  // A new source opens on its own last day.
  const selectSource = useCallback((key: DataSourceKey) => {
    setSource(key);
    setDay(LAST_DAY);
  }, []);

  return {
    crew: lockedCrewId ? sim.crew.filter(m => m.id === lockedCrewId) : sim.crew,
    sources: mission
      ? DATA_SOURCE_OPTIONS.filter(o => o.key === 'simulated')
      : DATA_SOURCE_OPTIONS,
    source,
    // Scenarios only shape simulated data; an import has none.
    scenarios:
      source !== 'simulated'
        ? []
        : mission
        ? SCENARIO_OPTIONS.filter(o => o.key === mission.scenario)
        : SCENARIO_OPTIONS,
    crewId,
    scenario,
    logKey,
    day,
    maxDay,
    sim,
    view,
    badge: sourceBadge(loaded.kind, loaded.detail),
    importReport: loaded.importReport,
    selectCrew: setCrewId,
    selectScenario: setScenario,
    selectSource,
    prevDay,
    nextDay,
  };
}

export type TodayController = ReturnType<typeof useTodayController>;
