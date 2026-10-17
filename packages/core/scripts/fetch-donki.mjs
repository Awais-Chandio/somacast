// Fetches real Solar Energetic Particle (SEP) events from NASA DONKI and saves them to data/donki-sep.json.
// Usage: node scripts/fetch-donki.mjs 2024-01-01 2024-12-31
// Uses the public DEMO_KEY (rate limited). Set NASA_API_KEY to use your own free key.
// If the request fails it exits with an error and writes NOTHING. We never invent events.
import { mkdir, writeFile } from 'node:fs/promises';

const start = process.argv[2] ?? '2024-01-01';
const end = process.argv[3] ?? '2024-12-31';
const key = process.env.NASA_API_KEY ?? 'DEMO_KEY';
const url = `https://api.nasa.gov/DONKI/SEP?startDate=${start}&endDate=${end}&api_key=${key}`;

try {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  const events = await res.json();
  if (!Array.isArray(events)) throw new Error('Unexpected response shape (not an array)');
  await mkdir('data', { recursive: true });
  const out = {
    source: 'NASA DONKI SEP (https://ccmc.gsfc.nasa.gov/tools/DONKI/)',
    endpoint: `https://api.nasa.gov/DONKI/SEP?startDate=${start}&endDate=${end}`,
    fetchedAt: new Date().toISOString(),
    startDate: start,
    endDate: end,
    count: events.length,
    events,
  };
  await writeFile('data/donki-sep.json', JSON.stringify(out, null, 2) + '\n');
  console.log(`OK: saved ${events.length} SEP events (${start} to ${end}) to data/donki-sep.json`);
  if (events[0]) console.log('First event keys:', Object.keys(events[0]).join(', '));
} catch (err) {
  console.error(`FAILED: ${err instanceof Error ? err.message : err}`);
  console.error('No file written. Try again later or set NASA_API_KEY.');
  process.exit(1);
}
