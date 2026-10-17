import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueue, type OutboxStore } from '@somacast/core';
import {
  DEFAULT_CREW_ID,
  MISSION,
  SCENARIO_OPTIONS,
  type DemoMission,
  type ScenarioKey,
} from '../../../config/mission';
import { simulateMission } from '../../../shared/model/simulateMission';
import {
  blackBoxEntries,
  missionHistory,
  recordHistory,
} from '../../../sync/blackBox';
import { buildTodayView } from '../model/todayModel';

const MAX_DAY = MISSION.days - 1;

// Controller: owns the Today screen's state and user actions.
// No layout here (that is the view) and no health logic (that is the model / @somacast/core).
// Every day the screen shows is also written to the black-box outbox; onLogged lets the link panel recount.
// A new logEpoch (after a demo reset) logs the day on screen again.
// lockedCrewId: a signed-in crew member sees and logs only their own crew.
// mission (signed in): the account's own scenario (locked) and start day. The black box then records
// the whole mission so far, days 0..mission.day, not only the days the screen visits.
export function useTodayController(
  outbox: OutboxStore,
  onLogged?: () => void,
  logEpoch = 0,
  lockedCrewId?: string,
  mission?: DemoMission,
) {
  const [chosenScenario, setScenario] = useState<ScenarioKey>('normal');
  const scenario = mission?.scenario ?? chosenScenario;
  const [chosenCrewId, setCrewId] = useState(DEFAULT_CREW_ID);
  const crewId = lockedCrewId ?? chosenCrewId;
  const [day, setDay] = useState(() =>
    Math.min(MAX_DAY, Math.max(0, mission?.day ?? MAX_DAY)),
  );

  const sim = useMemo(() => simulateMission(scenario), [scenario]);
  const view = useMemo(
    () => buildTodayView(sim, crewId, day),
    [sim, crewId, day],
  );
  const logEntries = useMemo(
    () => blackBoxEntries(sim, scenario, crewId, day),
    [sim, scenario, crewId, day],
  );

  // Signed in: the whole mission so far, once per account screen and again after a demo reset.
  const historyThrough = mission ? Math.min(MAX_DAY, mission.day) : null;
  useEffect(() => {
    if (historyThrough === null) return;
    recordHistory(
      outbox,
      missionHistory(sim, scenario, crewId, historyThrough),
    );
    onLogged?.();
  }, [outbox, sim, scenario, crewId, historyThrough, onLogged, logEpoch]);

  useEffect(() => {
    for (const e of logEntries) enqueue(outbox, e); // same day again = same keys = no-op
    onLogged?.();
  }, [outbox, logEntries, onLogged, logEpoch]);

  const prevDay = useCallback(() => setDay(d => Math.max(0, d - 1)), []);
  const nextDay = useCallback(() => setDay(d => Math.min(MAX_DAY, d + 1)), []);

  return {
    crew: lockedCrewId ? sim.crew.filter(m => m.id === lockedCrewId) : sim.crew,
    scenarios: mission
      ? SCENARIO_OPTIONS.filter(o => o.key === mission.scenario)
      : SCENARIO_OPTIONS,
    crewId,
    scenario,
    day,
    maxDay: MAX_DAY,
    view,
    selectCrew: setCrewId,
    selectScenario: setScenario,
    prevDay,
    nextDay,
  };
}

export type TodayController = ReturnType<typeof useTodayController>;
