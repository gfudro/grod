import { TICKS_PER_DAY } from './seasons';

/**
 * Hunger in three steps (Greg, 2026-10-15). Nobody moves out and no house
 * drops a tier (CLAUDE.md rule 3), but a house left without fish
 * visibly gets worse until its people stop working:
 *   1. right away: its people walk and work slower, a fish over their heads
 *   2. after `sadTicks`: they turn red, with a sad face
 *   3. after `strikeTicks`: they go home and do nothing until fish arrives
 * The starting crew has no house and never goes hungry, and anyone fishing
 * or carrying fish keeps at it — so the gród can always feed itself again.
 */
export const HUNGER = {
  sadTicks: 5 * TICKS_PER_DAY,
  strikeTicks: 10 * TICKS_PER_DAY,
  /** Hungry people take this many times longer per step and per piece of work. */
  slowMultiplier: 1.5,
} as const;
