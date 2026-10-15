import { MOUND } from '../data/mound';
import type { ResourceAmounts, ResourceType } from '../data/resources';
import { tileKey, type Vec2 } from '../data/types';
import { addChronicleEntry } from './chronicle';
import { footprintTiles, footprintTouchesRoad } from './footprint';
import { warehouseAmount, type GameState, type Mound, type VillagerState } from './state';

/** Every tile of the mound's 3×3 footprint. */
export function moundTiles(mound: Mound): Vec2[] {
  return footprintTiles('kopiec', mound.tile);
}

export function moundTileKeys(mound: Mound): string[] {
  return moundTiles(mound).map(tileKey);
}

/** The kopiec may be marked out once a dwór stands, and only once. */
export function moundUnlocked(state: GameState): boolean {
  return state.houses.some((h) => h.tier >= MOUND.unlockTier);
}

export function canStartMound(state: GameState): boolean {
  return state.mound === null && moundUnlocked(state);
}

/** Marks out the kopiec. Placement checks happen in sim/placement.ts. */
export function startMound(state: GameState, tile: Vec2): void {
  state.mound = { tile: { ...tile }, delivered: {}, done: false, name: '', celebrated: false };
  addChronicleEntry(state, 'kopiec-zaczety');
}

export function moundBuilders(state: GameState): VillagerState[] {
  return state.villagers.filter((v) => v.job.kind === 'mound');
}

/** Units of each material still to come, minus what builders already carry. */
export function moundStillNeeded(state: GameState, except?: VillagerState): ResourceAmounts {
  const mound = state.mound;
  const left: ResourceAmounts = {};
  if (!mound) return left;
  for (const [resource, amount] of Object.entries(MOUND.cost) as [ResourceType, number][]) {
    left[resource] = amount - (mound.delivered[resource] ?? 0);
  }
  for (const v of moundBuilders(state)) {
    if (v !== except && v.carrying && (left[v.carrying] ?? 0) > 0) left[v.carrying]! -= 1;
  }
  return left;
}

/** What a builder at the warehouse should pick up next: a needed material that is in stock. */
export function nextMoundResource(state: GameState, builder?: VillagerState): ResourceType | null {
  const left = moundStillNeeded(state, builder);
  for (const [resource, amount] of Object.entries(left) as [ResourceType, number][]) {
    if (amount > 0 && warehouseAmount(state, resource) > 0) return resource;
  }
  return null;
}

/** Materials the mound still waits for that the warehouse doesn't have. */
export function moundMissing(state: GameState): ResourceType[] {
  const left = moundStillNeeded(state);
  return (Object.entries(left) as [ResourceType, number][])
    .filter(([resource, amount]) => amount > 0 && warehouseAmount(state, resource) === 0)
    .map(([resource]) => resource);
}

/** A free villager may join in: the mound is unfinished, reachable and has work in stock. */
export function moundWantsBuilder(state: GameState): boolean {
  const mound = state.mound;
  if (!mound || mound.done) return false;
  if (!footprintTouchesRoad('kopiec', mound.tile, state.roads)) return false;
  if (moundBuilders(state).length >= MOUND.maxBuilders) return false;
  return nextMoundResource(state) !== null;
}

export function moundTotals(mound: Mound): { have: number; need: number } {
  const need = Object.values(MOUND.cost).reduce((sum, n) => sum + n, 0);
  const have = (Object.keys(MOUND.cost) as ResourceType[]).reduce(
    (sum, r) => sum + Math.min(mound.delivered[r] ?? 0, MOUND.cost[r as keyof typeof MOUND.cost]),
    0,
  );
  return { have, need };
}

/** Layers already heaped up, 0..MOUND.layers — the last one only when done. */
export function moundLayers(mound: Mound): number {
  if (mound.done) return MOUND.layers;
  const { have, need } = moundTotals(mound);
  return Math.min(MOUND.layers - 1, Math.floor((have / need) * MOUND.layers));
}

/** A builder put a unit down on the mound. */
export function deliverToMound(state: GameState, resource: ResourceType): void {
  const mound = state.mound;
  if (!mound || mound.done) return;
  mound.delivered[resource] = (mound.delivered[resource] ?? 0) + 1;
  const complete = (Object.entries(MOUND.cost) as [ResourceType, number][]).every(
    ([r, amount]) => (mound.delivered[r] ?? 0) >= amount,
  );
  if (complete) {
    mound.done = true;
    addChronicleEntry(state, 'kopiec-usypany');
  }
}

/** Names (or renames) the kopiec; the chronicle remembers each name. */
export function nameMound(state: GameState, name: string): boolean {
  const mound = state.mound;
  const trimmed = name.trim().slice(0, 40);
  if (!mound || !trimmed || trimmed === mound.name) return false;
  mound.name = trimmed;
  addChronicleEntry(state, 'kopiec-nazwa', { name: trimmed });
  return true;
}
