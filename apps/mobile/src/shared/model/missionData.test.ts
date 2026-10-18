import { assess } from '@somacast/core';
import { lastDay, loadMission, sourceBadge, sourceKindOf } from './missionData';
import { simulateMission } from './simulateMission';

describe('loadMission', () => {
  it('simulated: the same seeded mission as before, logged under the scenario', () => {
    const m = loadMission('simulated', 'blackoutDecline');
    expect(m.data).toEqual(simulateMission('blackoutDecline'));
    expect(m.kind).toBe('simulated');
    expect(m.logKey).toBe('blackoutDecline');
    expect(m.importReport).toBeNull();
    expect(lastDay(m.data)).toBe(89);
  });

  it('import: the bundled example file, 30 days of EX1, every row read', () => {
    const m = loadMission('importExample', 'normal');
    expect(m.kind).toBe('imported');
    expect(m.logKey).toBe('import-example');
    expect(m.data.crew).toEqual([{ id: 'EX1', name: 'EX1' }]);
    expect(m.data.readings).toHaveLength(30);
    expect(lastDay(m.data)).toBe(29);
    expect(m.importReport).toBe(
      '30 rows imported, 0 rejected. Example file: the values are made up.',
    );
    // The same engine runs on it.
    expect(assess(m.data.readings, 'EX1', 29).forecast.horizonHours).toBe(72);
  });
});

describe('sourceBadge', () => {
  it('says SIMULATED DATA only for simulated readings', () => {
    expect(sourceBadge('simulated').text).toBe('SIMULATED DATA');
    expect(sourceBadge('imported', 'example file').text).toBe(
      'IMPORTED DATA (example file)',
    );
    for (const kind of [
      'imported',
      'manual',
      'device',
      'mixed',
      'none',
    ] as const)
      expect(sourceBadge(kind).text).not.toContain('SIMULATED');
  });

  it('the kind comes from the readings, so mixed readings are called mixed', () => {
    const sim = simulateMission('normal').readings.slice(0, 2);
    expect(sourceKindOf(sim)).toBe('simulated');
    expect(sourceKindOf([sim[0]!, { ...sim[1]!, source: 'imported' }])).toBe(
      'mixed',
    );
    expect(sourceKindOf([])).toBe('none');
  });
});
