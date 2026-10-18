import type { Crew, DailyReading, SourceKind } from '../domain/schemas';

// The plug socket between data and engine. Anything that can hand over daily readings (the
// simulator, a CSV export, manual entry, a device) is a ReadingSource. The engine, the black box
// and the screens only ever see DailyReading[], so changing the source changes nothing else.
export interface ReadingSource {
  id: string;
  label: string; // shown to the user, e.g. "Simulator (Normal)"
  kind: SourceKind; // copied onto every reading it returns
  load(crewId: string): Promise<DailyReading[]>;
}

// Everything a screen needs from a source: who is in it and their readings.
export type MissionData = {
  crew: Crew[];
  readings: DailyReading[];
};
