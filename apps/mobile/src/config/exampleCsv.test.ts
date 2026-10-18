import { readFileSync } from 'fs';
import { join } from 'path';
import { EXAMPLE_CSV } from './exampleCsv';

describe('EXAMPLE_CSV', () => {
  it('is exactly samples/wearable-export-example.csv (copy the file into exampleCsv.ts if this fails)', () => {
    const file = readFileSync(
      join(__dirname, '../../../../samples/wearable-export-example.csv'),
      'utf8',
    );
    expect(EXAMPLE_CSV).toBe(file);
  });

  it('says in its header that it is an example with made-up values', () => {
    expect(EXAMPLE_CSV.split('\n')[0]).toBe(
      '# EXAMPLE FILE, values made up for format illustration.',
    );
  });
});
