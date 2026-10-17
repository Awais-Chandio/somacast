import { useCallback, useEffect, useMemo, useState } from 'react';
import { enqueue, type OutboxStore } from '@somacast/core';
import {
  DEFAULT_CREW_ID,
  MISSION,
  SCENARIO_OPTIONS,
  type ScenarioKey,
} from '../../../config/mission';
import { simulateMission } from '../../../shared/model/simulateMission';
import { blackBoxEntries } from '../../../sync/blackBox';
import { buildTodayView } from '../model/todayModel';

const MAX_DAY = MISSION.days - 1;

// Controller: owns the Today screen's state and user actions.
// No layout here (that is the view) and no health logic (that is the model / @somacast/core).
// Every day the screen shows is also written to the black-box outbox; onLogged lets the link panel recount.
// A new logEpoch (after a demo reset) logs the day on screen again.
// lockedCrewId: a signed-in crew member sees and logs only their own crew.
export function useTodayController(
  outbox: OutboxStore,
  onLogged?: () => void,
  logEpoch = 0,
  lockedCrewId?: string,
) {
  const [scenario, setScenario] = useState<ScenarioKey>('normal');
  const [chosenCrewId, setCrewId] = useState(DEFAULT_CREW_ID);
  const crewId = lockedCrewId ?? chosenCrewId;
  const [day, setDay] = useState(MAX_DAY);

  const sim = useMemo(() => simulateMission(scenario), [scenario]);
  const view = useMemo(
    () => buildTodayView(sim, crewId, day),
    [sim, crewId, day],
  );
  const logEntries = useMemo(
    () => blackBoxEntries(sim, scenario, crewId, day),
    [sim, scenario, crewId, day],
  );

  useEffect(() => {
    for (const e of logEntries) enqueue(outbox, e); // same day again = same keys = no-op
    onLogged?.();
  }, [outbox, logEntries, onLogged, logEpoch]);

  const prevDay = useCallback(() => setDay(d => Math.max(0, d - 1)), []);
  const nextDay = useCallback(() => setDay(d => Math.min(MAX_DAY, d + 1)), []);

  return {
    crew: lockedCrewId ? sim.crew.filter(m => m.id === lockedCrewId) : sim.crew,
    scenarios: SCENARIO_OPTIONS,
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
