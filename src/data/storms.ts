import type { ResourceAmounts } from './resources';
import { TICKS_PER_DAY } from './seasons';

/**
 * Summer storms (GDD "Pory roku i zagrożenia"): a dark cloud drifts in
 * over a house and hangs there for a few days, then lightning strikes.
 * A kontyna Peruna in range takes the bolt; otherwise the house catches
 * fire, and buckets from a studnia in range can still put it out.
 */
export const STORM = {
  /** The first year is calm; storms come every summer from this year on. */
  firstYear: 2,
  /** Storms per summer, picked at random between the two (inclusive). */
  perSummer: { min: 2, max: 3 },
  /** How long the cloud hangs over its house before the bolt (5 days = 30 s at x1). */
  warningTicks: 5 * TICKS_PER_DAY,
  /** How long the cloud takes to drift in from the map edge (drawing only). */
  cloudTravelTicks: TICKS_PER_DAY,
  /** How long the bolt stays on screen. */
  flashTicks: 15,
  /** How long a house burns before it falls to ruins (50 s at x1). */
  fireTicks: 500,
  /** Buckets of water that put a fire out. */
  bucketsToDouse: 3,
  /** At most this many free villagers run with buckets to one fire. */
  maxDousers: 3,
} as const;

/** Rebuilding burned ruins (ODBUDUJ): back to the same tier the house had. */
export const RUINS_REBUILD: { cost: ResourceAmounts; buildTicks: number } = {
  cost: { drewno: 4 },
  buildTicks: 40,
};
