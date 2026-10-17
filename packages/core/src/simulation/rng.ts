// Small seeded random number generator (mulberry32) so simulated data is repeatable.
export type Rng = {
  next(): number; // uniform in [0, 1)
  normal(mean: number, sd: number): number; // Gaussian via Box-Muller
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const normal = (mean: number, sd: number): number => {
    const u1 = Math.max(next(), 1e-12);
    const u2 = next();
    return (
      mean + sd * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    );
  };

  return { next, normal };
}
