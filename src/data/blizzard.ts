import { TICKS_PER_DAY } from './seasons';

/**
 * Winter blizzards (GDD "Pory roku i zagrożenia"): seen coming days
 * ahead, then for a few days everyone wades slowly and houses burn their
 * firewood twice as fast, and snow drifts pile up on the roads. People
 * with łopaty from the kuźnia dig the drifts out; the rest melt in spring.
 */
export const BLIZZARD = {
  /** The first winters are calm; blizzards come from this year on. */
  firstYear: 2,
  /** Blizzards per winter, picked at random between the two (inclusive). */
  perWinter: { min: 1, max: 2 },
  /** Shown on the top bar this long before it hits (5 days = 30 s at x1). */
  warningTicks: 5 * TICKS_PER_DAY,
  /** How long it blows. */
  durationTicks: 5 * TICKS_PER_DAY,
  /** Walking takes this many times longer while it blows (on top of the winter snow). */
  walkMultiplier: 2,
  /** Houses burn firewood this many times faster while it blows. */
  firewoodMultiplier: 2,
  /** Share of the road tiles under a drift by the time it is over. */
  driftShare: 0.5,
  /** Stepping onto a drift takes this many times longer. */
  driftWalkMultiplier: 3,
  /** Ticks to dig one drift out with a łopata. */
  clearTicks: 30,
  /** At most this many villagers dig at once (each needs a łopata from the warehouse). */
  maxDiggers: 3,
} as const;
