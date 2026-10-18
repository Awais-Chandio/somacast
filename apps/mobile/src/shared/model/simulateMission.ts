import {
  scenarios,
  SimulatorSource,
  type SimulationResult,
} from '@somacast/core';
import { MISSION, type ScenarioKey } from '../../config/mission';

// One seeded run of the simulated mission for the chosen scenario.
export function simulateMission(scenario: ScenarioKey): SimulationResult {
  return new SimulatorSource({
    ...MISSION,
    scenario: scenarios[scenario],
  }).run();
}
