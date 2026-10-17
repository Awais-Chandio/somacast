import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_CREW_ID,
  MISSION,
  SCENARIO_OPTIONS,
  type ScenarioKey,
} from '../../../config/mission';
import { simulateMission } from '../../../shared/model/simulateMission';
import { buildTodayView } from '../model/todayModel';

const MAX_DAY = MISSION.days - 1;

// Controller: owns the Today screen's state and user actions.
// No layout here (that is the view) and no health logic (that is the model / @somacast/core).
export function useTodayController() {
  const [scenario, setScenario] = useState<ScenarioKey>('normal');
  const [crewId, setCrewId] = useState(DEFAULT_CREW_ID);
  const [day, setDay] = useState(MAX_DAY);

  const sim = useMemo(() => simulateMission(scenario), [scenario]);
  const view = useMemo(
    () => buildTodayView(sim, crewId, day),
    [sim, crewId, day],
  );

  const prevDay = useCallback(() => setDay(d => Math.max(0, d - 1)), []);
  const nextDay = useCallback(() => setDay(d => Math.min(MAX_DAY, d + 1)), []);

  return {
    crew: sim.crew,
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
