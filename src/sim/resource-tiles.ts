import { FOREST, MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { ResourceSearch } from '../data/buildings';
import { tileKey, type Vec2 } from '../data/types';

export function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/** Land a worker can cross on foot, off the roads: everything but the river. */
export function isLand(tile: Vec2): boolean {
  if (tile.x < 0 || tile.y < 0 || tile.x >= MAP_WIDTH || tile.y >= MAP_HEIGHT) return false;
  return TERRAIN[tile.y][tile.x] !== 'woda';
}

/**
 * Every land tile on the map. A drwal or rybak crosses open ground between
 * their building and the tree or water they work (GDD 0.12.0) — only the
 * trip to the warehouse has to follow the roads.
 */
export const LAND_KEYS: ReadonlySet<string> = (() => {
  const keys = new Set<string>();
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (isLand({ x, y })) keys.add(tileKey({ x, y }));
    }
  }
  return keys;
})();

const TREE_KEYS: ReadonlySet<string> = new Set(FOREST.map((tree) => tileKey(tree)));

const STEPS: Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export interface FoundResource {
  tile: Vec2;
  /** Tiles a worker walks over open ground from the building to it. */
  distance: number;
}

/**
 * The tree or water nearest on foot from the building (breadth-first over
 * land), so a drwal never picks a tree that is close as the crow flies
 * but on the far side of the river.
 */
export function findResource(buildingTile: Vec2, search: ResourceSearch): FoundResource | null {
  if (search === 'na-miejscu') return { tile: { ...buildingTile }, distance: 0 };
  const seen = new Set<string>([tileKey(buildingTile)]);
  let frontier: Vec2[] = [buildingTile];
  for (let distance = 0; frontier.length > 0; distance++) {
    const next: Vec2[] = [];
    for (const tile of frontier) {
      if (search === 'drzewo' && TREE_KEYS.has(tileKey(tile))) return { tile, distance };
      for (const step of STEPS) {
        const neighbor = { x: tile.x + step.x, y: tile.y + step.y };
        const key = tileKey(neighbor);
        if (seen.has(key)) continue;
        seen.add(key);
        // A rybak fishes from the bank: the water tile itself is the goal.
        if (search === 'woda' && neighbor.x >= 0 && neighbor.y >= 0 && neighbor.x < MAP_WIDTH &&
          neighbor.y < MAP_HEIGHT && TERRAIN[neighbor.y][neighbor.x] === 'woda') {
          return { tile: neighbor, distance: distance + 1 };
        }
        if (isLand(neighbor)) next.push(neighbor);
      }
    }
    frontier = next;
  }
  return null;
}

/** The tile a building's worker must reach to gather its resource. */
export function findResourceTile(buildingTile: Vec2, search: ResourceSearch): Vec2 | null {
  return findResource(buildingTile, search)?.tile ?? null;
}
