import { describe, it, expect } from '@jest/globals';
import { assess } from '../engine/forecast';
import { simulate } from '../simulation/simulator';
import { scenarios } from '../simulation/scenarios';
import { SimulatorSource } from './simulatorSource';
import {
  CSV_COLUMNS,
  CsvImportSource,
  parseReadingsCsv,
  readingsToCsv,
} from './csvImportSource';

const options = {
  seed: 42,
  crewCount: 4,
  days: 90,
  startDate: '2027-01-01',
  scenario: scenarios.blackoutDecline,
};

const HEADER = CSV_COLUMNS.join(',');

describe('SimulatorSource', () => {
  it('returns exactly what simulate() makes, one crew member at a time', async () => {
    const source = new SimulatorSource(options);
    const sim = simulate(options);
    expect(source.kind).toBe('simulated');
    expect(source.run()).toEqual(sim);
    expect(await source.load('C2')).toEqual(
      sim.readings.filter(r => r.crewId === 'C2'),
    );
    expect(await source.load('C9')).toEqual([]);
  });
});

describe('CsvImportSource', () => {
  it('happy path: header, a comment, two days, marked imported', async () => {
    const csv = [
      '# EXAMPLE FILE, values made up for format illustration',
      HEADER,
      '2027-03-01,EX1,61,58,6.2,118,2.1,0.48,4',
      '',
      '2027-03-02,EX1,63,52,5.9,110,2.3,0.51,3',
    ].join('\n');
    const source = new CsvImportSource('csv:test', 'Test file', csv);
    expect(source.errors).toEqual([]);
    expect(source.kind).toBe('imported');
    expect(source.crewIds()).toEqual(['EX1']);
    const readings = await source.load('EX1');
    expect(readings).toEqual([
      {
        crewId: 'EX1',
        day: 0,
        date: '2027-03-01',
        restingHr: 61,
        hrv: 58,
        sleepHours: 6.2,
        exerciseMin: 118,
        cabinCo2: 2.1,
        radiationDose: 0.48,
        psychCheckin: 4,
        source: 'imported',
      },
      expect.objectContaining({ day: 1, date: '2027-03-02', psychCheckin: 3 }),
    ]);
  });

  it('columns may come in any order; CRLF line ends and a BOM are fine', () => {
    const cols = [...CSV_COLUMNS].reverse();
    const row: Record<string, string> = {
      date: '2027-03-01',
      crewId: 'EX1',
      restingHr: '61',
      hrv: '58',
      sleepHours: '6.2',
      exerciseMin: '118',
      cabinCo2: '2.1',
      radiationDose: '0.48',
      psychCheckin: '4',
    };
    const csv = `﻿${cols.join(',')}\r\n${cols.map(c => row[c]).join(',')}\r\n`;
    const { readings, errors } = parseReadingsCsv(csv);
    expect(errors).toEqual([]);
    expect(readings[0]?.sleepHours).toBe(6.2);
  });

  it('a bad row is rejected with its line number; the good rows still load', async () => {
    const csv = [
      '# comment on line 1',
      HEADER, // line 2
      '2027-03-01,EX1,61,58,6.2,118,2.1,0.48,4', // line 3
      '2027-03-02,EX1,63,52,abc,110,2.3,0.51,3', // line 4: sleepHours not a number
      '2027-03-03,EX1,62,55,6.0,115,2.2,0.50,9', // line 5: psych check-in above 5
      '2027-03-04,EX1,62,55,6.0,115,2.2', // line 6: too few fields
      '2027-02-30,EX1,62,55,6.0,115,2.2,0.50,4', // line 7: no such date
      '2027-03-01,EX1,60,57,6.1,120,2.1,0.49,4', // line 8: same day twice
      '2027-03-05,EX1,62,55,6.0,-5,2.2,0.50,4', // line 9: negative exercise
      '2027-03-06,EX1,64,50,5.8,105,2.4,0.52,3', // line 10
    ].join('\n');
    const source = new CsvImportSource('csv:test', 'Test file', csv);
    expect(source.errors.map(e => e.line)).toEqual([4, 5, 6, 7, 8, 9]);
    expect(source.errors[0]?.message).toMatch(/^sleepHours: /);
    expect(source.errors[1]?.message).toMatch(/^psychCheckin: /);
    expect(source.errors[2]?.message).toBe('expected 9 fields, found 7');
    expect(source.errors[3]?.message).toMatch(/not a calendar date/);
    expect(source.errors[4]?.message).toBe(
      'duplicate row for EX1 on 2027-03-01 (first on line 3)',
    );
    expect(source.errors[5]?.message).toMatch(/^exerciseMin: /);
    const readings = await source.load('EX1');
    expect(readings.map(r => [r.date, r.day])).toEqual([
      ['2027-03-01', 0],
      ['2027-03-06', 5], // day count follows the calendar, so the gap stays a gap
    ]);
  });

  it('a header without every column rejects the file instead of guessing', () => {
    const csv = 'date,crewId,restingHr\n2027-03-01,EX1,61\n';
    const { readings, errors } = parseReadingsCsv(csv);
    expect(readings).toEqual([]);
    expect(errors).toEqual([
      {
        line: 1,
        message:
          'header is missing column(s): hrv, sleepHours, exerciseMin, cabinCo2, radiationDose, psychCheckin',
      },
    ]);
  });

  it('an empty file reports a missing header', () => {
    expect(parseReadingsCsv('# only a comment\n').errors).toEqual([
      { line: 1, message: 'no header row found' },
    ]);
  });
});

describe('the engine does not care where the numbers came from', () => {
  it('assess() gives the same alerts and forecast from the simulator or from a CSV of the same numbers', async () => {
    const sim = new SimulatorSource(options);
    const csv = new CsvImportSource(
      'csv:roundtrip',
      'Round trip',
      readingsToCsv(sim.run().readings),
    );
    expect(csv.errors).toEqual([]);

    for (const crewId of ['C1', 'C2']) {
      const fromSim = await sim.load(crewId);
      const fromCsv = await csv.load(crewId);
      expect(fromCsv.map(r => r.source)).toEqual(fromCsv.map(() => 'imported'));
      // Same numbers, only the source label differs.
      expect(fromCsv.map(({ source: _s, ...r }) => r)).toEqual(
        fromSim.map(({ source: _s, ...r }) => r),
      );
      for (const day of [20, 60, 75, 89])
        expect(assess(fromCsv, crewId, day)).toEqual(
          assess(fromSim, crewId, day),
        );
    }
    // Kenji on day 75 of the blackout scenario is a Storm either way.
    expect(assess(await csv.load('C2'), 'C2', 75).forecast.state).toBe('storm');
  });
});
