import { describe, expect, it } from 'vitest';
import { canBuildRoadOn } from './road-draw';
import { MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { TerrainType } from '../data/tiles';

function findTile(terrain: TerrainType): { x: number; y: number } {
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (TERRAIN[y][x] === terrain) return { x, y };
    }
  }
  throw new Error(`no ${terrain} tile found on the map`);
}

describe('canBuildRoadOn', () => {
  it('allows roads on the riverbank, so a rybak can ever be reached', () => {
    // 'brzeg' sits between every 'trawa' tile and the river — without it,
    // no road could ever touch water and a rybak's catch would never move.
    expect(canBuildRoadOn(findTile('brzeg'))).toBe(true);
  });

  it('still refuses roads directly on water', () => {
    expect(canBuildRoadOn(findTile('woda'))).toBe(false);
  });

  it('allows roads on plain grass', () => {
    expect(canBuildRoadOn(findTile('trawa'))).toBe(true);
  });
});
