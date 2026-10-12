import type { GameState, VillagerState } from './state';
import { villagerTarget } from './state';
import { findPath } from './pathfinding';

/** Ticks to cross one tile: 1 tile per simulated second at the base 10 ticks/second rate. */
export const TICKS_PER_TILE = 10;

export function tick(state: GameState): void {
  state.tick += 1;
  advanceVillager(state);
}

function advanceVillager(state: GameState): void {
  const villager = state.villager;

  if (villager.motion !== 'walking') {
    planNextLeg(state, villager);
  }
  if (villager.motion !== 'walking') return;

  villager.segmentTicks += 1;
  if (villager.segmentTicks < TICKS_PER_TILE) return;

  villager.segmentTicks = 0;
  villager.from = villager.to;
  villager.path = villager.path.slice(1);

  if (villager.path.length > 0) {
    villager.to = villager.path[0];
    updateFacing(villager);
    return;
  }

  // Reached the end of this leg. If it's the active target, swap ends
  // so the next planning pass sends the villager back the other way.
  const target = villagerTarget(villager);
  if (villager.from.x === target.x && villager.from.y === target.y) {
    villager.targetIndex = villager.targetIndex === 0 ? 1 : 0;
  }
  villager.motion = 'idle';
}

function planNextLeg(state: GameState, villager: VillagerState): void {
  const target = villagerTarget(villager);
  if (villager.from.x === target.x && villager.from.y === target.y) {
    villager.motion = 'idle';
    return;
  }

  const path = findPath(state.roads, villager.from, target);
  if (!path || path.length === 0) {
    villager.motion = 'waiting';
    return;
  }

  villager.path = path;
  villager.to = path[0];
  villager.segmentTicks = 0;
  villager.motion = 'walking';
  updateFacing(villager);
}

function updateFacing(villager: VillagerState): void {
  if (villager.to.x > villager.from.x) villager.facing = 1;
  else if (villager.to.x < villager.from.x) villager.facing = -1;
}
