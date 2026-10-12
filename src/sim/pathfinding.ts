import type { Vec2 } from '../data/types';
import { tileKey } from '../data/types';

function heuristic(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function neighborsOf(tile: Vec2): Vec2[] {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ];
}

function lowestFScore(open: Set<string>, fScore: Map<string, number>): string {
  let best = '';
  let bestScore = Infinity;
  for (const k of open) {
    const score = fScore.get(k) ?? Infinity;
    if (score < bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

function reconstructPath(
  cameFrom: Map<string, string>,
  nodeOf: Map<string, Vec2>,
  endKey: string,
): Vec2[] {
  const path: Vec2[] = [nodeOf.get(endKey)!];
  let key = endKey;
  while (cameFrom.has(key)) {
    key = cameFrom.get(key)!;
    path.unshift(nodeOf.get(key)!);
  }
  return path.slice(1); // drop the start tile, caller already stands there
}

/**
 * 4-directional A* over road tiles. `walkable` holds every tile the
 * villager may step on (the drawn roads); start and goal are always
 * allowed even if not themselves marked walkable, since a building
 * tile is a valid path endpoint without being a road.
 */
export function findPath(walkable: ReadonlySet<string>, start: Vec2, goal: Vec2): Vec2[] | null {
  const startKey = tileKey(start);
  const goalKey = tileKey(goal);
  if (startKey === goalKey) return [];

  const open = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const nodeOf = new Map<string, Vec2>([[startKey, start]]);
  const gScore = new Map<string, number>([[startKey, 0]]);
  const fScore = new Map<string, number>([[startKey, heuristic(start, goal)]]);

  while (open.size > 0) {
    const currentKey = lowestFScore(open, fScore);
    if (currentKey === goalKey) {
      return reconstructPath(cameFrom, nodeOf, currentKey);
    }
    open.delete(currentKey);
    const current = nodeOf.get(currentKey)!;

    for (const neighbor of neighborsOf(current)) {
      const neighborKey = tileKey(neighbor);
      const passable = neighborKey === goalKey || neighborKey === startKey || walkable.has(neighborKey);
      if (!passable) continue;

      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        nodeOf.set(neighborKey, neighbor);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + heuristic(neighbor, goal));
        open.add(neighborKey);
      }
    }
  }

  return null;
}

/** True when at least one of the tile's four neighbours is a drawn road. */
export function isAdjacentToRoad(tile: Vec2, roads: ReadonlySet<string>): boolean {
  return neighborsOf(tile).some((neighbor) => roads.has(tileKey(neighbor)));
}
