import { metricIds } from '../domain/metrics';
import {
  ReadingSchema,
  type DailyReading,
  type SourceKind,
} from '../domain/schemas';
import type { ReadingSource } from './readingSource';

// CSV import (documented in docs/real-mission.md). One row per crew member per day:
//
//   date,crewId,restingHr,hrv,sleepHours,exerciseMin,cabinCo2,radiationDose,psychCheckin
//   2027-01-01,EX1,61,58,6.2,118,2.1,0.48,4
//
// - Plain comma-separated values: no quotes, no commas inside a field.
// - Lines starting with # are comments; blank lines are skipped.
// - The header names every column above, in any order. Extra columns are ignored.
// - Units are the ones in domain/metrics.ts. Every row is checked with ReadingSchema.
// - Day 0 is the earliest valid date in the file, so all crew members share one day count.
// A bad row is reported with its line number and left out; it never stops the rest of the file.

export const CSV_COLUMNS = ['date', 'crewId', ...metricIds] as const;

export type CsvRowError = { line: number; message: string }; // line is 1-based, as in an editor

export type CsvParseResult = {
  readings: DailyReading[]; // sorted by crew id, then day
  errors: CsvRowError[];
};

const DECIMAL = /^-?\d+(\.\d+)?$/;

// "6.2" -> 6.2; anything else (empty, "abc", "1e3", "0x10") -> NaN, which ReadingSchema refuses.
function toNumber(field: string): number {
  return DECIMAL.test(field) ? Number(field) : NaN;
}

// A YYYY-MM-DD string that is a real calendar day (2027-02-30 is not).
function dayNumber(date: string): number | null {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== date)
    return null;
  return Math.round(ms / 86_400_000);
}

export function parseReadingsCsv(
  text: string,
  source: SourceKind = 'imported',
): CsvParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  const errors: CsvRowError[] = [];
  let header: string[] | null = null;
  let headerOk = false;
  const rows: { line: number; reading: DailyReading; epochDay: number }[] = [];
  const seen = new Map<string, number>(); // crewId|date -> line it was first seen on

  lines.forEach((raw, i) => {
    const line = i + 1;
    const content = raw.trim();
    if (content === '' || content.startsWith('#')) return;
    const fields = content.split(',').map(f => f.trim());

    if (!header) {
      const missing = CSV_COLUMNS.filter(c => !fields.includes(c));
      if (missing.length)
        errors.push({
          line,
          message: `header is missing column(s): ${missing.join(', ')}`,
        });
      header = fields;
      headerOk = missing.length === 0;
      return;
    }
    if (!headerOk) return; // the header error already explains why no row was read

    if (fields.length !== header.length) {
      errors.push({
        line,
        message: `expected ${header.length} fields, found ${fields.length}`,
      });
      return;
    }
    const field = (name: string) => fields[header!.indexOf(name)] ?? '';
    const candidate: Record<string, unknown> = {
      crewId: field('crewId'),
      date: field('date'),
      day: 0, // set below, once the earliest date in the file is known
      source,
    };
    for (const m of metricIds) candidate[m] = toNumber(field(m));

    const parsed = ReadingSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({
        line,
        message: parsed.error.issues
          .map(issue => `${issue.path.join('.') || 'row'}: ${issue.message}`)
          .join('; '),
      });
      return;
    }
    const epochDay = dayNumber(parsed.data.date);
    if (epochDay === null) {
      errors.push({
        line,
        message: `date: ${parsed.data.date} is not a calendar date`,
      });
      return;
    }
    const key = `${parsed.data.crewId}|${parsed.data.date}`;
    const first = seen.get(key);
    if (first !== undefined) {
      errors.push({
        line,
        message: `duplicate row for ${parsed.data.crewId} on ${parsed.data.date} (first on line ${first})`,
      });
      return;
    }
    seen.set(key, line);
    rows.push({ line, reading: parsed.data, epochDay });
  });

  if (!header) errors.push({ line: 1, message: 'no header row found' });

  const start = Math.min(...rows.map(r => r.epochDay));
  const readings = rows
    .map(r => ({ ...r.reading, day: r.epochDay - start }))
    .sort(
      (a, b) =>
        a.crewId.localeCompare(b.crewId, 'en', { numeric: true }) ||
        a.day - b.day,
    );
  return { readings, errors };
}

// The same format back out (header first). Used to round-trip readings in tests and examples.
export function readingsToCsv(readings: DailyReading[]): string {
  const rows = readings.map(r => CSV_COLUMNS.map(c => String(r[c])).join(','));
  return [CSV_COLUMNS.join(','), ...rows].join('\n') + '\n';
}

// A CSV file behind the ReadingSource socket. The text is parsed once, up front; bad rows are
// kept in `errors` for the screen to report.
export class CsvImportSource implements ReadingSource {
  readonly kind = 'imported' as const;
  readonly id: string;
  readonly label: string;
  readonly readings: DailyReading[];
  readonly errors: CsvRowError[];

  constructor(id: string, label: string, text: string) {
    this.id = id;
    this.label = label;
    const { readings, errors } = parseReadingsCsv(text, this.kind);
    this.readings = readings;
    this.errors = errors;
  }

  // Crew ids found in the file, in file-sorted order.
  crewIds(): string[] {
    return [...new Set(this.readings.map(r => r.crewId))];
  }

  async load(crewId: string): Promise<DailyReading[]> {
    return this.readings.filter(r => r.crewId === crewId);
  }
}
