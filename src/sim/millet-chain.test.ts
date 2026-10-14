import { describe, expect, it } from 'vitest';
import { createInitialState, houseGood, warehouseAmount, type Building, type GameState, type House } from './state';
import { tick } from './tick';
import { canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { houseCapacity } from './houses';
import { tileKey, type Vec2 } from '../data/types';
import { SEASON_TICKS } from '../data/seasons';

// Layout west of the warehouse (8,9): a road along row 8 from x=2 to x=9.
const FIELD_ANCHOR = { x: 4, y: 6 }; // 2×2 field (4..5, 6..7), its bottom row touches the road
const ZARNA_TILE = { x: 7, y: 7 };
const STUDNIA_TILE = { x: 6, y: 9 };
const HOUSE_TILE = { x: 3, y: 9 }; // 3 tiles from the studnia — just inside its range

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  return state;
}

function addBuilding(state: GameState, type: Building['type'], tile: Vec2, extra: Partial<Building> = {}): Building {
  const building: Building = {
    id: `budynek-${type}`,
    type,
    tile,
    resourceTile: null,
    workerId: null,
    paused: false,
    ...extra,
  };
  state.buildings.push(building);
  return building;
}

function addHouse(state: GameState, extra: Partial<House> = {}): House {
  const house: House = {
    id: 'dom-test',
    tile: HOUSE_TILE,
    tier: 0,
    residents: 3,
    goods: {},
    upgrade: null,
    ...extra,
  };
  state.houses.push(house);
  return house;
}

describe('pole prosa', () => {
  it('is sown in spring, grows through summer, and is harvested in autumn', () => {
    const state = withRoad();
    expect(tryPlaceConstructionSite(state, 'pole', FIELD_ANCHOR)).toBe(true);

    runTicks(state, 300); // construction
    expect(state.sites).toHaveLength(0);
    const field = state.buildings.find((b) => b.type === 'pole')!;
    expect(field.plots).toHaveLength(4);

    runTicks(state, 300); // sow all four plots
    expect(field.plots!.map((p) => p.stage)).toEqual(['kielki', 'kielki', 'kielki', 'kielki']);
    // Nothing more to do until autumn: the farmer goes back to the pool.
    expect(field.workerId).toBeNull();

    runTicks(state, SEASON_TICKS + 10 - state.tick); // into summer
    expect(field.plots!.every((p) => p.stage === 'lodygi')).toBe(true);
    expect(warehouseAmount(state, 'proso')).toBe(0);

    runTicks(state, SEASON_TICKS * 2 - state.tick + 1); // first tick of autumn
    expect(field.plots!.every((p) => p.stage === 'dojrzale' && p.yieldLeft === 3)).toBe(true);

    runTicks(state, 2400); // harvest: 4 plots × 3 units, one trip each
    expect(warehouseAmount(state, 'proso')).toBe(12);
    expect(field.plots!.every((p) => p.stage === 'sciete')).toBe(true);
    expect(state.villagers.every((v) => v.motion !== 'waiting')).toBe(true);
  });

  it('is not sown outside spring', () => {
    const state = withRoad();
    state.tick = SEASON_TICKS; // summer
    const field = addBuilding(state, 'pole', FIELD_ANCHOR, {
      plots: [0, 1, 2, 3].map(() => ({ stage: 'zaorane' as const, yieldLeft: 0 })),
    });

    runTicks(state, 300);

    expect(field.plots!.every((p) => p.stage === 'zaorane')).toBe(true);
    expect(field.workerId).toBeNull();
  });

  it('cannot overlap a road with any of its four tiles', () => {
    const state = withRoad();
    expect(canPlaceBuildingAt(state, 'pole', { x: 4, y: 7 })).toBe(false); // bottom row would sit on the road
    expect(canPlaceBuildingAt(state, 'pole', FIELD_ANCHOR)).toBe(true);
  });

  it('cannot overlap another building', () => {
    const state = withRoad();
    addBuilding(state, 'studnia', { x: 5, y: 6 });
    expect(canPlaceBuildingAt(state, 'pole', FIELD_ANCHOR)).toBe(false);
  });
});

describe('żarna', () => {
  it('fetches proso from the warehouse and brings back kasza, one for one', () => {
    const state = withRoad();
    state.warehouse.proso = 3;
    addBuilding(state, 'zarna', ZARNA_TILE);

    runTicks(state, 600);

    expect(warehouseAmount(state, 'proso')).toBe(0);
    expect(warehouseAmount(state, 'kasza')).toBe(3);
  });

  it('waits in front of the building showing proso when there is none', () => {
    const state = withRoad();
    const zarna = addBuilding(state, 'zarna', ZARNA_TILE);

    runTicks(state, 100);

    const worker = state.villagers.find((v) => v.id === zarna.workerId)!;
    expect(worker.from).toEqual(ZARNA_TILE);
    expect(worker.motion).toBe('waiting');
    expect(worker.waitingFor).toBe('proso');
  });
});

describe('studnia', () => {
  it('never takes a worker from the pool', () => {
    const state = withRoad();
    const studnia = addBuilding(state, 'studnia', STUDNIA_TILE);

    runTicks(state, 50);

    expect(studnia.workerId).toBeNull();
    expect(state.villagers.every((v) => v.job.kind === 'idle')).toBe(true);
  });
});

describe('tragarz with two goods', () => {
  it('still delivers kasza while the warehouse has no fish', () => {
    const state = withRoad();
    const house = addHouse(state);
    state.warehouse.kasza = 3;

    runTicks(state, 400);

    expect(houseGood(house, 'kasza')).toBe(3);
    expect(houseGood(house, 'ryba')).toBe(0);
  });
});

describe('ziemianka → chata', () => {
  function readyHouse(state: GameState): House {
    state.warehouse.drewno = 3;
    state.warehouse.glina = 2;
    return addHouse(state, { goods: { ryba: 5, kasza: 3 } });
  }

  it('grows into a chata once fed, with a studnia in range, paying the cost and getting rebuilt', () => {
    const state = withRoad();
    const house = readyHouse(state);
    addBuilding(state, 'studnia', STUDNIA_TILE);

    tick(state);
    expect(house.upgrade).not.toBeNull(); // started and paid for right away
    expect(warehouseAmount(state, 'drewno')).toBe(0);
    expect(warehouseAmount(state, 'glina')).toBe(0);

    runTicks(state, 1000); // builder carries 5 materials over one by one, then hammers
    expect(house.tier).toBe(1);
    expect(house.upgrade).toBeNull();
    expect(houseCapacity(house)).toBe(5);
  });

  it('does not grow without a studnia in range, and keeps the materials', () => {
    const state = withRoad();
    const house = readyHouse(state);
    addBuilding(state, 'studnia', { x: 9, y: 10 }); // 6 tiles away — out of range

    runTicks(state, 400);

    expect(house.tier).toBe(0);
    expect(house.upgrade).toBeNull();
    expect(warehouseAmount(state, 'drewno')).toBe(3);
  });

  it('does not grow while kasza is missing', () => {
    const state = withRoad();
    state.warehouse.drewno = 3;
    state.warehouse.glina = 2;
    const house = addHouse(state, { goods: { ryba: 5 } });
    addBuilding(state, 'studnia', STUDNIA_TILE);

    runTicks(state, 400);

    expect(house.tier).toBe(0);
    expect(house.upgrade).toBeNull();
  });

  it('never drops back to a ziemianka when its goods run out', () => {
    const state = withRoad();
    const house = addHouse(state, { tier: 1, goods: {} });

    runTicks(state, 200);

    expect(house.tier).toBe(1);
  });
});
