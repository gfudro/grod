import { FOREST, MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { ResourceSearch } from '../data/buildings';
import type { Vec2 } from '../data/types';

function manhattan(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function nearest(from: Vec2, candidates: Vec2[]): Vec2 | null {
  let best: Vec2 | null = null;
  let bestDist = Infinity;
  for (const candidate of candidates) {
    const dist = manhattan(from, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function allWaterTiles(): Vec2[] {
  const tiles: Vec2[] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (TERRAIN[y][x] === 'woda') tiles.push({ x, y });
    }
  }
  return tiles;
}

/** The tile a building's worker must reach to gather its resource. */
export function findResourceTile(buildingTile: Vec2, search: ResourceSearch): Vec2 | null {
  switch (search) {
    case 'na-miejscu':
      return { ...buildingTile };
    case 'drzewo':
      return nearest(
        buildingTile,
        FOREST.map((tree) => ({ x: tree.x, y: tree.y })),
      );
    case 'woda':
      return nearest(buildingTile, allWaterTiles());
  }
}
