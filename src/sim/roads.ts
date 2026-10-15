import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { occupiedTileKeys } from './footprint';
import { LAND_KEYS } from './resource-tiles';
import type { GameState } from './state';

/**
 * Takes these road tiles off the map (GUMKA). Returns the ones that
 * really were roads, for COFNIJ. Anyone walking a route over a removed
 * tile finishes the step under way and then finds a new way.
 */
export function eraseRoads(state: GameState, keys: Iterable<string>): string[] {
  const erased: string[] = [];
  for (const key of keys) {
    if (state.roads.delete(key)) erased.push(key);
  }
  if (erased.length === 0) return erased;
  const gone = new Set(erased);
  state.drifts = state.drifts.filter((k) => !gone.has(k)); // no road, no drift on it
  for (const v of state.villagers) {
    if (v.motion === 'walking' && v.path.some((t) => gone.has(tileKey(t)))) v.path = [v.to];
  }
  return erased;
}

/** COFNIJ after GUMKA: puts the roads back, except where something was built meanwhile. */
export function restoreRoads(state: GameState, keys: Iterable<string>): void {
  const occupied = occupiedTileKeys(state);
  for (const key of keys) {
    if (!occupied.has(key)) state.roads.add(key);
  }
}

/**
 * Someone left standing on open grass (their road was erased under them)
 * walks over the land to the nearest road, so nobody is stuck off the
 * roads for good. Returns null when they stand on a road, a building or
 * the warehouse — there "no way" means a missing road, shown as such.
 */
export function pathBackToRoad(state: GameState, from: Vec2): Vec2[] | null {
  const startKey = tileKey(from);
  if (state.roads.has(startKey) || startKey === tileKey(WAREHOUSE_TILE)) return null;
  if (occupiedTileKeys(state).has(startKey)) return null;

  const cameFrom = new Map<string, string>();
  const nodeOf = new Map<string, Vec2>([[startKey, from]]);
  let frontier: Vec2[] = [from];
  while (frontier.length > 0) {
    const next: Vec2[] = [];
    for (const tile of frontier) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: tile.x + dx, y: tile.y + dy };
        const key = tileKey(n);
        if (nodeOf.has(key) || !LAND_KEYS.has(key)) continue;
        nodeOf.set(key, n);
        cameFrom.set(key, tileKey(tile));
        if (state.roads.has(key)) {
          const path: Vec2[] = [n];
          let k = tileKey(tile);
          while (k !== startKey) {
            path.unshift(nodeOf.get(k)!);
            k = cameFrom.get(k)!;
          }
          return path;
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return null;
}
