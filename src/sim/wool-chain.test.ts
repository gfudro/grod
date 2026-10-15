import { describe, expect, it } from 'vitest';
import { createInitialState, houseGood, warehouseAmount, type Building, type GameState, type House } from './state';
import { tick } from './tick';
import { tryPlaceConstructionSite } from './placement';
import { houseCapacity, upgradeReadiness } from './houses';
import { tileKey, type Vec2 } from '../data/types';

// Layout west of the warehouse (8,9): a road along row 8 from x=2 to x=9.
const OWCZARNIA_TILE = { x: 3, y: 7 };
const TKALNIA_TILE = { x: 5, y: 7 };
const KONTYNA_TILE = { x: 7, y: 9 }; // 4 tiles from the house — just inside its range
const HOUSE_TILE = { x: 3, y: 9 };

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  return state;
}

function addBuilding(state: GameState, type: Building['type'], tile: Vec2): Building {
  const building: Building = { id: `budynek-${type}`, type, tile, resourceTile: null, workerId: null, paused: false };
  state.buildings.push(building);
  return building;
}

function addZagroda(state: GameState, extra: Partial<House> = {}): House {
  const house: House = {
    id: 'dom-test',
    tile: HOUSE_TILE,
    tier: 2,
    residents: 8,
    goods: {},
    upgrade: null,
    ...extra,
  };
  state.houses.push(house);
  return house;
}

describe('owczarnia → tkalnia', () => {
  it('shears sheep at the owczarnia and weaves the wool into ubrania at the tkalnia', () => {
    const state = withRoad();
    state.warehouse.drewno = 40;
    state.warehouse.glina = 30;
    expect(tryPlaceConstructionSite(state, 'owczarnia', OWCZARNIA_TILE)).toBe(true);
    expect(tryPlaceConstructionSite(state, 'tkalnia', TKALNIA_TILE)).toBe(true);

    runTicks(state, 4500);

    expect(state.sites).toHaveLength(0);
    expect(warehouseAmount(state, 'ubrania')).toBeGreaterThan(0);
    const owczarnia = state.buildings.find((b) => b.type === 'owczarnia')!;
    expect(owczarnia.workerId).not.toBeNull();
  });

  it('the weaver waits by the tkalnia, showing wełna, while there is no wool', () => {
    const state = withRoad();
    addBuilding(state, 'tkalnia', TKALNIA_TILE);

    runTicks(state, 100);

    const worker = state.villagers.find((v) => v.job.kind === 'process')!;
    expect(worker.motion).toBe('waiting');
    expect(worker.waitingFor).toBe('welna');
  });
});

describe('zagroda → dwór', () => {
  function readyZagroda(state: GameState): House {
    state.warehouse.drewno = 15;
    state.warehouse.glina = 12;
    return addZagroda(state, { goods: { ryba: 5, kasza: 3, ser: 3, ubrania: 3 } });
  }

  it('tragarze bring ubrania to a zagroda — it is what the zagroda needs to grow', () => {
    const state = withRoad();
    state.warehouse.ubrania = 5;
    const house = addZagroda(state, { goods: { ryba: 5, kasza: 3, ser: 3 } });

    runTicks(state, 400);

    expect(houseGood(house, 'ubrania')).toBe(3);
    expect(warehouseAmount(state, 'ubrania')).toBe(2);
  });

  it('grows into a dwór once it has ubrania and a kontyna in range', () => {
    const state = withRoad();
    const house = readyZagroda(state);
    addBuilding(state, 'kontyna', KONTYNA_TILE);

    tick(state);
    expect(house.upgrade).not.toBeNull();
    expect(warehouseAmount(state, 'drewno')).toBe(0);
    expect(warehouseAmount(state, 'glina')).toBe(0);

    runTicks(state, 4000);
    expect(house.tier).toBe(3);
    expect(houseCapacity(house)).toBe(12);
    expect(state.chronicle.some((e) => e.kind === 'pierwszy-dwor')).toBe(true);
  });

  it('a plac wiecowy is not enough: a zagroda needs the kontyna', () => {
    const state = withRoad();
    const house = readyZagroda(state);
    addBuilding(state, 'plac', { x: 6, y: 9 });

    runTicks(state, 400);

    expect(house.tier).toBe(2);
    expect(house.upgrade).toBeNull();
    const ready = upgradeReadiness(state, house);
    expect(ready.service).toBe('kontyna');
    expect(ready.serviceInRange).toBe(false);
  });

  it('does not grow while ubrania are missing', () => {
    const state = withRoad();
    state.warehouse.drewno = 15;
    state.warehouse.glina = 12;
    const house = addZagroda(state, { goods: { ryba: 5, kasza: 3, ser: 3 } });
    addBuilding(state, 'kontyna', KONTYNA_TILE);

    runTicks(state, 400);

    expect(house.tier).toBe(2);
  });

  it('a dwór wears out ubrania, and is the top tier', () => {
    const state = withRoad();
    const house = addZagroda(state, { tier: 3, residents: 12, goods: { ryba: 5, kasza: 3, ser: 3, ubrania: 3 } });

    runTicks(state, 950);

    expect(houseGood(house, 'ubrania')).toBeLessThan(3);
    expect(upgradeReadiness(state, house).canGrow).toBe(false);
  });
});
