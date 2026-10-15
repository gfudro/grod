import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type Building, type GameState } from './state';
import { tick } from './tick';
import { canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { findPath } from './pathfinding';
import { findResource, ROCK_KEYS } from './resource-tiles';
import { canBuildRoadOn } from '../input/road-draw';
import { MAP_HEIGHT, MAP_WIDTH, ROCKS, TERRAIN } from '../data/map';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { tileKey, type Vec2 } from '../data/types';

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

/** Lays a road from the warehouse to `to` over any ground a road may cross. */
function roadTo(state: GameState, to: Vec2): void {
  const ground = new Set<string>();
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) if (canBuildRoadOn({ x, y })) ground.add(tileKey({ x, y }));
  }
  ground.delete(tileKey(WAREHOUSE_TILE));
  ground.add(tileKey(WAREHOUSE_TILE));
  const path = findPath(ground, WAREHOUSE_TILE, to);
  if (!path) throw new Error(`no road to ${tileKey(to)}`);
  for (const t of path) if (!(t.x === WAREHOUSE_TILE.x && t.y === WAREHOUSE_TILE.y)) state.roads.add(tileKey(t));
}

function addBuilding(state: GameState, type: Building['type'], tile: Vec2, resourceTile: Vec2 | null = null): Building {
  const building: Building = { id: `budynek-${type}`, type, tile, resourceTile, workerId: null, paused: false };
  state.buildings.push(building);
  return building;
}

// Next to the bog in the south-west, with a road along row 18.
const RUDNIK_TILE = { x: 4, y: 17 };
// On the far bank, below the rocky hill (the ford is at 24,20).
const KAMIENIARZ_TILE = { x: 25, y: 16 };

describe('the map for the kopiec', () => {
  it('has a bog, which takes neither roads nor buildings', () => {
    const bog = { x: 4, y: 21 };
    expect(TERRAIN[bog.y][bog.x]).toBe('bagno');
    expect(canBuildRoadOn(bog)).toBe(false);
    expect(canPlaceBuildingAt(createInitialState(), 'drwal', bog)).toBe(false);
  });

  it('has rocks past the ford, and nothing is built on a rock', () => {
    expect(ROCKS.length).toBeGreaterThan(5);
    const rock = ROCKS[0];
    expect(canPlaceBuildingAt(createInitialState(), 'ziemianka', rock)).toBe(false);
  });

  it('a kamieniarz finds the nearest rock on foot, a rudnik the nearest bog', () => {
    const stone = findResource(KAMIENIARZ_TILE, 'skala');
    expect(stone && ROCK_KEYS.has(tileKey(stone.tile))).toBe(true);
    expect(stone!.distance).toBeLessThanOrEqual(6);
    const ore = findResource(RUDNIK_TILE, 'bagno');
    expect(ore && TERRAIN[ore.tile.y][ore.tile.x]).toBe('bagno');
  });

  it('a kamieniarz must stand near the rocks, a rudnik near the bog', () => {
    const state = createInitialState();
    expect(canPlaceBuildingAt(state, 'kamieniarz', { x: 3, y: 9 })).toBe(false);
    expect(canPlaceBuildingAt(state, 'rudnik', { x: 3, y: 9 })).toBe(false);
    expect(canPlaceBuildingAt(state, 'kamieniarz', KAMIENIARZ_TILE)).toBe(true);
    expect(canPlaceBuildingAt(state, 'rudnik', RUDNIK_TILE)).toBe(true);
  });
});

describe('rudnik → dymarka → kuźnia', () => {
  it('digs ruda in the bog, smelts it into żelazo and forges łopaty', () => {
    const state = createInitialState();
    roadTo(state, { x: 4, y: 18 });
    state.warehouse.drewno = 40;
    state.warehouse.glina = 30;
    state.warehouse.kamien = 20;
    // Beside the end of the road, wherever the road left room.
    const rudnik = [{ x: 3, y: 18 }, { x: 5, y: 18 }, RUDNIK_TILE].find((t) => !state.roads.has(tileKey(t)))!;
    expect(tryPlaceConstructionSite(state, 'rudnik', rudnik)).toBe(true);
    // Just north of the warehouse, along a short road of their own.
    for (let x = 5; x <= 8; x++) state.roads.add(tileKey({ x, y: 8 }));
    expect(tryPlaceConstructionSite(state, 'dymarka', { x: 6, y: 7 })).toBe(true);
    expect(tryPlaceConstructionSite(state, 'kuznia', { x: 8, y: 7 })).toBe(true);

    runTicks(state, 9000);

    expect(state.sites).toHaveLength(0);
    expect(warehouseAmount(state, 'lopaty')).toBeGreaterThan(0);
  });

  it('the smith waits by the kuźnia, showing żelazo, while there is no iron', () => {
    const state = createInitialState();
    for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
    addBuilding(state, 'kuznia', { x: 5, y: 7 });

    runTicks(state, 100);

    const worker = state.villagers.find((v) => v.job.kind === 'process')!;
    expect(worker.motion).toBe('waiting');
    expect(worker.waitingFor).toBe('zelazo');
  });
});

describe('kamieniarz', () => {
  it('breaks stone on the rocky hill and carries it home over the ford', () => {
    const state = createInitialState();
    roadTo(state, { x: KAMIENIARZ_TILE.x, y: KAMIENIARZ_TILE.y + 1 });
    expect(state.roads.has('24,20')).toBe(true); // the road goes through the bród
    state.warehouse.drewno = 10;
    state.warehouse.glina = 4;
    expect(tryPlaceConstructionSite(state, 'kamieniarz', KAMIENIARZ_TILE)).toBe(true);

    runTicks(state, 14000); // 14 materials carried over the ford, one by one

    expect(warehouseAmount(state, 'kamien')).toBeGreaterThan(0);
  });
});
