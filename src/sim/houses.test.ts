import { describe, expect, it } from 'vitest';
import { createInitialState, houseGood, villagePopulation, warehouseAmount, type GameState } from './state';
import { tick, SETTLER_CHECK_INTERVAL } from './tick';
import { tryPlaceConstructionSite } from './placement';
import { tileKey } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { MAP_HEIGHT } from '../data/map';

const HOUSE_TILE = { x: 8, y: 7 }; // two tiles north of the warehouse

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

/** L-shaped road from the warehouse straight down to the south map edge. */
function connectToSouthEdge(state: GameState, x: number): void {
  for (let y = WAREHOUSE_TILE.y; y < MAP_HEIGHT; y++) {
    state.roads.add(tileKey({ x, y }));
  }
}

function buildHouse(state: GameState): void {
  state.roads.add(tileKey({ x: 8, y: 8 }));
  const placed = tryPlaceConstructionSite(state, 'ziemianka', HOUSE_TILE);
  expect(placed).toBe(true);
  runTicks(state, 600); // plenty of time to deliver 4 drewno and hammer 40 ticks
}

describe('ziemianka construction', () => {
  it('builds a house instead of a production building', () => {
    const state = createInitialState();
    buildHouse(state);

    expect(state.sites).toHaveLength(0);
    expect(state.buildings).toHaveLength(0); // a house is not a producer
    expect(state.houses).toHaveLength(1);
    expect(state.houses[0]).toMatchObject({ tile: HOUSE_TILE, tier: 0, residents: 0, goods: {}, upgrade: null });
  });
});

describe('settlers', () => {
  it('walk in from the map edge to fill a vacant house, once a road reaches the edge', () => {
    const state = createInitialState();
    buildHouse(state);
    connectToSouthEdge(state, 8);

    const countBefore = state.villagers.length;
    runTicks(state, SETTLER_CHECK_INTERVAL); // one settler-check tick

    expect(state.villagers.length).toBe(countBefore + 1);
    const settler = state.villagers[state.villagers.length - 1];
    expect(settler.job.kind).toBe('arriving');

    // Give everyone plenty of time to walk in. The house has 3 vacancies
    // and checks run every SETTLER_CHECK_INTERVAL ticks, so more than one
    // settler can legitimately be en route before the first one arrives —
    // that's fine, capacity is never exceeded (see the overcommit test).
    runTicks(state, MAP_HEIGHT * 10 + 20);
    expect(state.houses[0].residents).toBeGreaterThanOrEqual(1);
    expect(state.houses[0].residents).toBeLessThanOrEqual(3);
    const joined = state.villagers.find((v) => v.id === settler.id)!;
    expect(joined.job.kind).toBe('idle');
  });

  it('never commits more settlers than a house has vacancies', () => {
    const state = createInitialState();
    buildHouse(state);
    connectToSouthEdge(state, 8);
    state.warehouse.ryba = 999; // keep the house fed so hunger never blocks growth

    runTicks(state, MAP_HEIGHT * 20); // long enough for the house to fully fill

    expect(state.houses[0].residents).toBe(3); // ziemianka capacity
    const enRouteOrArrived = state.villagers.filter(
      (v) => v.job.kind === 'arriving' && v.job.houseId === state.houses[0].id,
    );
    expect(enRouteOrArrived).toHaveLength(0); // none left stranded over capacity
  });

  it('never spawns without a road reaching the map edge', () => {
    const state = createInitialState();
    buildHouse(state);
    // No road beyond the house itself — nothing reaches the edge.

    const countBefore = state.villagers.length;
    runTicks(state, SETTLER_CHECK_INTERVAL * 3);

    expect(state.villagers.length).toBe(countBefore);
    expect(state.houses[0].residents).toBe(0);
  });

  it('stops filling a house once it has residents but zero fish (hunger)', () => {
    const state = createInitialState();
    buildHouse(state);
    connectToSouthEdge(state, 8);
    // Someone already lives here, and no fish ever enters the warehouse in
    // this test, so the house is hungry from the start: nobody new sets out.
    state.houses[0].residents = 1;

    runTicks(state, MAP_HEIGHT * 20);

    expect(houseGood(state.houses[0], 'ryba')).toBe(0);
    expect(state.houses[0].residents).toBe(1);
    expect(state.villagers.some((v) => v.job.kind === 'arriving')).toBe(false);
  });
});

describe('population', () => {
  it('counts the starting crew and settlers once they have arrived, not while walking in', () => {
    const state = createInitialState();
    expect(villagePopulation(state)).toBe(3);
    buildHouse(state);
    connectToSouthEdge(state, 8);
    state.warehouse.ryba = 999;

    runTicks(state, SETTLER_CHECK_INTERVAL);
    expect(state.villagers.length).toBe(4); // one settler on the way
    expect(villagePopulation(state)).toBe(3);

    runTicks(state, MAP_HEIGHT * 20);
    expect(villagePopulation(state)).toBe(3 + state.houses[0].residents);
  });
});

describe('tragarz delivery', () => {
  it('tops a connected house up to its fish target and then stops', () => {
    const state = createInitialState();
    buildHouse(state);
    state.warehouse.ryba = 10;

    runTicks(state, 400);

    expect(houseGood(state.houses[0], 'ryba')).toBe(5); // ziemianka fish target
    expect(warehouseAmount(state, 'ryba')).toBe(5); // 10 - 5 delivered
  });

  it('never delivers to a house with no road touching it', () => {
    const state = createInitialState();
    // Place the finished house directly (bypassing construction) to isolate
    // the delivery-assignment gate from road-reachability during building.
    state.houses.push({
      id: 'dom-test',
      tile: HOUSE_TILE,
      tier: 0,
      residents: 1,
      goods: {},
      upgrade: null,
    });
    state.warehouse.ryba = 10;
    // no roads at all

    runTicks(state, 200);

    expect(houseGood(state.houses[0], 'ryba')).toBe(0);
    expect(state.villagers.every((v) => v.job.kind === 'idle')).toBe(true);
  });
});
