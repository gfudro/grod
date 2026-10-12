import type { Vec2 } from '../data/types';
import { WAREHOUSE_TILE, SECOND_WAYPOINT } from '../data/waypoints';
import { createRng, type RngState } from './rng';

export type SpeedMultiplier = 0 | 1 | 2 | 3;

export type VillagerMotion = 'idle' | 'walking' | 'waiting';

export interface VillagerState {
  from: Vec2;
  to: Vec2;
  /** Ticks elapsed walking from `from` to `to`, 0..TICKS_PER_TILE. Integer to stay exactly deterministic. */
  segmentTicks: number;
  /** Remaining tiles after `to`, ending at the current target. */
  path: Vec2[];
  endpoints: [Vec2, Vec2];
  targetIndex: 0 | 1;
  motion: VillagerMotion;
  facing: 1 | -1;
}

export interface GameState {
  tick: number;
  rng: RngState;
  speed: SpeedMultiplier;
  /** Drawn road tiles, keyed by `"x,y"` (see data/types#tileKey). */
  roads: Set<string>;
  villager: VillagerState;
}

export function villagerTarget(villager: VillagerState): Vec2 {
  return villager.endpoints[villager.targetIndex];
}

export function createInitialState(seed = 1): GameState {
  const start = { ...WAREHOUSE_TILE };
  return {
    tick: 0,
    rng: createRng(seed),
    speed: 1,
    roads: new Set(),
    villager: {
      from: start,
      to: { ...start },
      segmentTicks: 0,
      path: [],
      endpoints: [{ ...WAREHOUSE_TILE }, { ...SECOND_WAYPOINT }],
      targetIndex: 1,
      motion: 'waiting',
      facing: 1,
    },
  };
}
