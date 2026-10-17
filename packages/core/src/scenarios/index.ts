import normal from './normal.json';
import blackoutDecline from './blackout-decline.json';
import solarStorm from './solar-storm.json';
import { ScenarioSchema, type Scenario } from '../schemas';

// Every scenario file is validated when the module loads.
export const scenarios: Record<
  'normal' | 'blackoutDecline' | 'solarStorm',
  Scenario
> = {
  normal: ScenarioSchema.parse(normal),
  blackoutDecline: ScenarioSchema.parse(blackoutDecline),
  solarStorm: ScenarioSchema.parse(solarStorm),
};
