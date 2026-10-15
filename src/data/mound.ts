import type { ResourceAmounts } from './resources';

/**
 * The kopiec, the goal of the game (GDD "Cel gry"): heaped up by the
 * whole tribe once the gród has a dwór. Nothing is paid up front —
 * free villagers carry the materials over one by one, as the warehouse
 * has them, and the mound visibly grows layer by layer.
 */
export const MOUND = {
  cost: { drewno: 30, kamien: 40, lopaty: 10 } satisfies ResourceAmounts,
  /** How many free villagers may carry for the mound at once. */
  maxBuilders: 4,
  /** Visible layers as it grows; the last one is the finished mound. */
  layers: 5,
  /** The house tier that must stand first (3 = dwór). */
  unlockTier: 3,
} as const;
