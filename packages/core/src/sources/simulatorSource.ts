import {
  simulate,
  type SimulationOptions,
  type SimulationResult,
} from '../simulation/simulator';
import type { DailyReading } from '../domain/schemas';
import type { ReadingSource } from './readingSource';

// The seeded simulator behind the ReadingSource socket. It only wraps simulate(): same options,
// same readings. The run is made once and reused.
export class SimulatorSource implements ReadingSource {
  readonly kind = 'simulated' as const;
  readonly id: string;
  readonly label: string;
  private readonly options: SimulationOptions;
  private result: SimulationResult | null = null;

  constructor(options: SimulationOptions) {
    this.options = options;
    this.id = `simulator:${options.scenario.id}`;
    this.label = `Simulator (${options.scenario.title})`;
  }

  // The whole simulated mission (every crew member), exactly as simulate() returns it.
  run(): SimulationResult {
    if (!this.result) this.result = simulate(this.options);
    return this.result;
  }

  async load(crewId: string): Promise<DailyReading[]> {
    return this.run().readings.filter(r => r.crewId === crewId);
  }
}
