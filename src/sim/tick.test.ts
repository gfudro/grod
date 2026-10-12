import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type GameState } from './state';
import { tick } from './tick';
import { tryPlaceConstructionSite } from './placement';
import { tileKey } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';

// Four tiles north of the warehouse, close enough to a tree for a drwal
// to be placeable there under the maxResourceRange limit.
const SITE_TILE = { x: 8, y: 5 };
const ROAD_TILES = [
  { x: 8, y: 8 },
  { x: 8, y: 7 },
  { x: 8, y: 6 },
]; // connects warehouse <-> site tile

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

describe('construction', () => {
  it('builds a drwal once a worker delivers all the materials, without double-spending the cost', () => {
    const state = createInitialState();
    for (const r of ROAD_TILES) state.roads.add(tileKey(r));
    const startingWood = warehouseAmount(state, 'drewno');

    // Go through the real placement entry point (same one the input layer
    // uses) so the upfront cost deduction is actually exercised here.
    const placed = tryPlaceConstructionSite(state, 'drwal', SITE_TILE);
    expect(placed).toBe(true);
    expect(warehouseAmount(state, 'drewno')).toBe(startingWood - 3); // paid upfront

    runTicks(state, 300);

    expect(state.sites).toHaveLength(0);
    expect(state.buildings).toHaveLength(1);
    expect(state.buildings[0]).toMatchObject({ type: 'drwal', tile: SITE_TILE });
    // Delivery only carries the already-paid materials; no second deduction.
    expect(warehouseAmount(state, 'drewno')).toBe(startingWood - 3);
  });

  it('leaves the site unbuilt when there are no free workers', () => {
    const state = createInitialState();
    for (const r of ROAD_TILES) state.roads.add(tileKey(r));
    state.villagers = []; // nobody available to pick up the job

    state.sites.push({
      id: 'plac-test',
      type: 'drwal',
      tile: SITE_TILE,
      delivered: {},
      assignedWorkerId: null,
    });

    runTicks(state, 50);

    expect(state.sites).toHaveLength(1);
    expect(state.sites[0].assignedWorkerId).toBeNull();
  });
});

describe('production', () => {
  it('assigns a worker to a road-connected building and delivers resources to the warehouse', () => {
    const state = createInitialState();
    for (const r of ROAD_TILES) state.roads.add(tileKey(r));
    state.buildings.push({
      id: 'budynek-test',
      type: 'glinianka',
      tile: SITE_TILE,
      resourceTile: { ...SITE_TILE }, // glinianka gathers on its own tile
      workerId: null,
    });

    runTicks(state, 120);

    const building = state.buildings[0];
    expect(building.workerId).not.toBeNull();
    expect(warehouseAmount(state, 'glina')).toBeGreaterThanOrEqual(1);
  });

  it('never assigns a worker to a building with no road touching it', () => {
    const state = createInitialState();
    // no roads at all
    state.buildings.push({
      id: 'budynek-test',
      type: 'glinianka',
      tile: SITE_TILE,
      resourceTile: { ...SITE_TILE },
      workerId: null,
    });

    runTicks(state, 100);

    expect(state.buildings[0].workerId).toBeNull();
    expect(warehouseAmount(state, 'glina')).toBe(0);
    expect(state.villagers.every((v) => v.job.kind === 'idle')).toBe(true);
  });
});

describe('determinism', () => {
  it('is deterministic for the same starting state and actions', () => {
    function setup(): GameState {
      const state = createInitialState(7);
      for (const r of ROAD_TILES) state.roads.add(tileKey(r));
      state.buildings.push({
        id: 'budynek-test',
        type: 'glinianka',
        tile: SITE_TILE,
        resourceTile: { ...SITE_TILE },
        workerId: null,
      });
      return state;
    }
    const a = setup();
    const b = setup();

    for (let i = 0; i < 150; i++) {
      tick(a);
      tick(b);
    }

    expect(a.villagers).toEqual(b.villagers);
    expect(a.warehouse).toEqual(b.warehouse);
    expect(a.tick).toBe(b.tick);
  });
});

describe('idle workers', () => {
  it('walk back to the warehouse when they have nothing to do', () => {
    const state = createInitialState();
    const villager = state.villagers[0];
    villager.from = { x: 2, y: 2 };
    villager.to = { x: 2, y: 2 };
    // A simple L-shaped road corridor from (2,2) to the warehouse.
    for (let y = 2; y <= 9; y++) state.roads.add(tileKey({ x: 2, y }));
    for (let x = 2; x <= 8; x++) state.roads.add(tileKey({ x, y: 9 }));

    runTicks(state, 200);

    expect(villager.from).toEqual(WAREHOUSE_TILE);
  });
});
