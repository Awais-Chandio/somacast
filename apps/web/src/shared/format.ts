// Times in the console are shown in UTC, the time base mission control and the station share.
export function utc(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

export function count(n: number): string {
  return n.toLocaleString('en-US');
}

// Whole numbers as they are, others to `digits` places with trailing zeros dropped (2.05, 37.8).
export function num(n: number, digits = 1): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(digits)));
}

// "56 bpm", but "3 (1 to 5)" for a scale whose unit is a phrase.
export function withUnit(n: number, unit: string, digits = 1): string {
  return unit.includes(' ')
    ? `${num(n, digits)} (${unit})`
    : `${num(n, digits)} ${unit}`;
}
