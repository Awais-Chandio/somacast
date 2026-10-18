import {
  CsvImportSource,
  type DailyReading,
  type MissionData,
  type SourceKind,
} from '@somacast/core';
import { EXAMPLE_CSV } from '../../config/exampleCsv';
import type { DataSourceKey } from '../../config/dataSources';
import type { ScenarioKey } from '../../config/mission';
import { simulateMission } from './simulateMission';

// Model: turns the chosen data source into the readings the Today screen shows. Whatever the
// source, the result is the same MissionData shape, so nothing after this point changes.

export type LoadedMission = {
  data: MissionData;
  // Prefix of black-box ids. Each simulated scenario and each import is its own mission, so their
  // day numbers are never mixed (the same rule the ground console uses).
  logKey: string;
  kind: SourceKind | 'mixed' | 'none'; // read from the readings themselves, not from the choice
  detail: string | null; // e.g. "example file", shown next to the source on the badge
  importReport: string | null; // rows read and rows rejected, for an import
};

// The bundled example is parsed once.
let example: CsvImportSource | null = null;
function exampleImport(): CsvImportSource {
  if (!example)
    example = new CsvImportSource(
      'csv:wearable-export-example',
      'Example wearable export',
      EXAMPLE_CSV,
    );
  return example;
}

export function sourceKindOf(readings: DailyReading[]): LoadedMission['kind'] {
  const kinds = new Set(readings.map(r => r.source));
  if (kinds.size > 1) return 'mixed';
  return [...kinds][0] ?? 'none';
}

export function loadMission(
  source: DataSourceKey,
  scenario: ScenarioKey,
): LoadedMission {
  if (source === 'simulated') {
    const data = simulateMission(scenario);
    return {
      data,
      logKey: scenario,
      kind: sourceKindOf(data.readings),
      detail: null,
      importReport: null,
    };
  }
  const csv = exampleImport();
  const data: MissionData = {
    // A CSV has crew ids only; the id is the name.
    crew: csv.crewIds().map(id => ({ id, name: id })),
    readings: csv.readings,
  };
  const days = data.readings.length;
  const bad = csv.errors.length;
  const first = csv.errors[0];
  return {
    data,
    logKey: 'import-example',
    kind: sourceKindOf(data.readings),
    detail: 'example file',
    importReport: `${days} ${
      days === 1 ? 'row' : 'rows'
    } imported, ${bad} rejected${
      first ? ` (line ${first.line}: ${first.message})` : ''
    }. Example file: the values are made up.`,
  };
}

// The last day with a reading (0 when there is none).
export function lastDay(data: MissionData): number {
  return data.readings.reduce((max, r) => Math.max(max, r.day), 0);
}

export type SourceLabel = { text: string; a11y: string; readingsLabel: string };

// What the badge says, from where the readings really came from. "SIMULATED DATA" only for
// simulated readings.
export function sourceBadge(
  kind: LoadedMission['kind'],
  detail: string | null = null,
): SourceLabel {
  const note = detail ? ` (${detail})` : '';
  switch (kind) {
    case 'simulated':
      return {
        text: 'SIMULATED DATA',
        a11y: 'All values on this screen are simulated data',
        readingsLabel: 'LATEST READINGS (SIMULATED)',
      };
    case 'imported':
      return {
        text: `IMPORTED DATA${note}`,
        a11y: `All values on this screen are imported data${note}`,
        readingsLabel: 'LATEST READINGS (IMPORTED)',
      };
    case 'manual':
      return {
        text: `MANUAL ENTRY${note}`,
        a11y: `All values on this screen were entered by hand${note}`,
        readingsLabel: 'LATEST READINGS (MANUAL)',
      };
    case 'device':
      return {
        text: `DEVICE DATA${note}`,
        a11y: `All values on this screen come from a device${note}`,
        readingsLabel: 'LATEST READINGS (DEVICE)',
      };
    case 'mixed':
      return {
        text: 'MIXED DATA SOURCES',
        a11y: 'Values on this screen come from more than one source',
        readingsLabel: 'LATEST READINGS (MIXED SOURCES)',
      };
    case 'none':
      return {
        text: 'NO DATA',
        a11y: 'There are no readings for this screen',
        readingsLabel: 'LATEST READINGS',
      };
  }
}
