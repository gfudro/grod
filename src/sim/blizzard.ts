import { BLIZZARD } from '../data/blizzard';
import { SEASON_TICKS, TICKS_PER_DAY } from '../data/seasons';
import { tileKey, type Vec2 } from '../data/types';
import { addChronicleEntry } from './chronicle';
import { nextInt } from './rng';
import { currentSeason, currentYear } from './seasons';
import type { Blizzard, GameState, VillagerState } from './state';

/**
 * Plans this winter's blizzards, called on the first tick of winter.
 * Each is announced BLIZZARD.warningTicks before it blows, and they are
 * spread over the season so they come one at a time.
 */
export function planBlizzards(state: GameState): void {
  if (currentYear(state) < BLIZZARD.firstYear) return;
  const { min, max } = BLIZZARD.perWinter;
  const count = min + nextInt(state.rng, max - min + 1);
  const slot = Math.floor(SEASON_TICKS / count);
  const span = BLIZZARD.warningTicks + BLIZZARD.durationTicks;
  const slack = Math.max(1, slot - span - TICKS_PER_DAY);
  for (let i = 0; i < count; i++) {
    const appearTick = state.tick + slot * i + nextInt(state.rng, slack);
    const startTick = appearTick + BLIZZARD.warningTicks;
    state.blizzards.push({ appearTick, startTick, endTick: startTick + BLIZZARD.durationTicks });
  }
}

/** The blizzard blowing right now, if any. */
export function activeBlizzard(state: GameState): Blizzard | null {
  return state.blizzards.find((b) => state.tick >= b.startTick && state.tick < b.endTick) ?? null;
}

/** The blizzard announced on the top bar but not blowing yet, if any. */
export function comingBlizzard(state: GameState): Blizzard | null {
  return state.blizzards.find((b) => state.tick >= b.appearTick && state.tick < b.startTick) ?? null;
}

/** Whole days until it hits (while coming) or until it's over (while blowing). */
export function blizzardDays(state: GameState, blizzard: Blizzard): number {
  const until = state.tick < blizzard.startTick ? blizzard.startTick : blizzard.endTick;
  return Math.max(1, Math.ceil((until - state.tick) / TICKS_PER_DAY));
}

/**
 * Runs every tick: drifts pile up on the roads while it blows, and all
 * snow is gone in spring.
 */
export function advanceBlizzards(state: GameState): void {
  if (currentSeason(state) !== 'zima') {
    if (state.blizzards.length > 0) state.blizzards = [];
    if (state.drifts.length > 0) state.drifts = []; // the drifts melt in spring
    return;
  }
  for (const b of state.blizzards) {
    if (state.tick === b.startTick) addChronicleEntry(state, 'sniezyca');
  }
  state.blizzards = state.blizzards.filter((b) => state.tick < b.endTick);

  const blowing = activeBlizzard(state);
  if (!blowing) return;
  // Drifts grow steadily over the blizzard, up to driftShare of the roads.
  const progress = (state.tick - blowing.startTick + 1) / BLIZZARD.durationTicks;
  const target = Math.floor(state.roads.size * BLIZZARD.driftShare * progress);
  if (state.drifts.length >= target) return;
  const drifted = new Set(state.drifts);
  const bare = [...state.roads].filter((key) => !drifted.has(key));
  if (bare.length > 0) state.drifts.push(bare[nextInt(state.rng, bare.length)]);
}

export function isDrift(state: GameState, tile: Vec2): boolean {
  return state.drifts.length > 0 && state.drifts.includes(tileKey(tile));
}

export function clearDrift(state: GameState, tile: Vec2): void {
  const key = tileKey(tile);
  state.drifts = state.drifts.filter((k) => k !== key);
}

export function diggers(state: GameState): VillagerState[] {
  return state.villagers.filter((v) => v.job.kind === 'dig');
}

/** Drift tiles no digger is heading for yet. */
export function unclaimedDrifts(state: GameState, except?: VillagerState): string[] {
  const claimed = new Set(
    diggers(state)
      .filter((v) => v !== except && v.job.kind === 'dig' && v.job.tile)
      .map((v) => (v.job.kind === 'dig' && v.job.tile ? tileKey(v.job.tile) : '')),
  );
  return state.drifts.filter((k) => !claimed.has(k));
}
