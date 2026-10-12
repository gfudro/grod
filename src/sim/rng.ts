/**
 * Deterministic seeded RNG (mulberry32). The only source of randomness
 * allowed in the simulation — never Math.random() here, so saves and
 * playtest sessions can be replayed exactly.
 */
export interface RngState {
  seed: number;
}

export function createRng(seed: number): RngState {
  return { seed: seed >>> 0 };
}

/** Returns a float in [0, 1) and advances the RNG state in place. */
export function nextFloat(rng: RngState): number {
  rng.seed |= 0;
  rng.seed = (rng.seed + 0x6d2b79f5) | 0;
  let t = rng.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Returns an integer in [0, max). */
export function nextInt(rng: RngState, max: number): number {
  return Math.floor(nextFloat(rng) * max);
}
