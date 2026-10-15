import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type GameState } from './state';
import { tick } from './tick';
import { canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { findResource } from './resource-tiles';
import { isAdjacentToRoad } from './pathfinding';
import { tileKey, type Vec2 } from '../data/types';
import { TERRAIN } from '../data/map';

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withRoads(tiles: Vec2[]): GameState {
  const state = createInitialState();
  for (const t of tiles) state.roads.add(tileKey(t));
  return state;
}

describe('drwal and rybak cross open ground to their tree or water', () => {
  it('a drwal needs a road only to his hut, not to the tree', () => {
    // Warehouse (8,9) → road up and west to the hut at (6,6); the forest stays roadless.
    const state = withRoads([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 7 }]);
    state.warehouse.drewno = 3;
    expect(tryPlaceConstructionSite(state, 'drwal', { x: 6, y: 6 })).toBe(true);

    runTicks(state, 800);

    const drwal = state.buildings.find((b) => b.type === 'drwal')!;
    expect(isAdjacentToRoad(drwal.resourceTile!, state.roads)).toBe(false);
    expect(warehouseAmount(state, 'drewno')).toBeGreaterThan(0);
    expect(state.villagers.every((v) => v.motion !== 'waiting')).toBe(true);
  });

  it('a rybak needs a road only to his hut, not down to the water', () => {
    const state = withRoads([{ x: 8, y: 8 }]);
    expect(tryPlaceConstructionSite(state, 'rybak', { x: 9, y: 8 })).toBe(true);

    runTicks(state, 800);

    const rybak = state.buildings.find((b) => b.type === 'rybak')!;
    expect(TERRAIN[rybak.resourceTile!.y][rybak.resourceTile!.x]).toBe('woda');
    expect(isAdjacentToRoad(rybak.resourceTile!, state.roads)).toBe(false);
    expect(warehouseAmount(state, 'ryba')).toBeGreaterThan(0);
  });

  it('carries the catch back past the hut and along the road, never cutting across to the warehouse', () => {
    const state = withRoads([{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 7 }]);
    state.warehouse.drewno = 3;
    tryPlaceConstructionSite(state, 'drwal', { x: 6, y: 6 });
    runTicks(state, 300); // built, worker on the job

    const onGround = new Set<string>();
    for (let i = 0; i < 600; i++) {
      tick(state);
      for (const v of state.villagers) {
        if (v.job.kind === 'produce' && v.carrying) onGround.add(tileKey(v.from));
      }
    }
    // Carrying wood, the drwal only ever stands on land near the forest,
    // at his hut, or on the road — never on the grass by the warehouse.
    expect(onGround.has('7,9')).toBe(false);
    expect(onGround.has('7,7')).toBe(false);
  });

  it('counts the drwal range on foot, so a tree across the river is out of reach', () => {
    // East bank, right by the river: the old forest is close as the crow
    // flies only through the water, so on foot it is far away.
    const across = { x: 16, y: 4 };
    const found = findResource(across, 'drzewo');
    expect(found).not.toBeNull();
    expect(found!.tile.x).toBeGreaterThan(20); // the north-east forest, on its own bank
    expect(canPlaceBuildingAt(createInitialState(), 'drwal', { x: 8, y: 12 })).toBe(false);
  });
});
