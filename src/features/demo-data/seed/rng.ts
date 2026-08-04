// Deterministic seeded PRNG (mulberry32) so the demo universe is stable
// across requests within a process — no external dependency needed.
function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = {
  next(): number;
  int(min: number, max: number): number;
  float(min: number, max: number, decimals?: number): number;
  bool(probability?: number): boolean;
  pick<T>(items: readonly T[]): T;
  pickMany<T>(items: readonly T[], count: number): T[];
  shuffle<T>(items: readonly T[]): T[];
  logInt(min: number, max: number): number;
};

export function createRng(seed: number): Rng {
  const next = mulberry32(seed);

  const int = (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min;
  const float = (min: number, max: number, decimals = 2) => {
    const value = next() * (max - min) + min;
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  };
  const bool = (probability = 0.5) => next() < probability;
  const pick = <T>(items: readonly T[]): T => items[int(0, items.length - 1)];
  const shuffle = <T>(items: readonly T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pickMany = <T>(items: readonly T[], count: number): T[] => shuffle(items).slice(0, Math.min(count, items.length));
  // Log-distributed integer — used for follower counts so most values cluster
  // low with a realistic long tail toward `max`, rather than a flat spread.
  const logInt = (min: number, max: number) => {
    const logMin = Math.log(Math.max(1, min));
    const logMax = Math.log(max);
    return Math.round(Math.exp(next() * (logMax - logMin) + logMin));
  };

  return { next, int, float, bool, pick, pickMany, shuffle, logInt };
}
