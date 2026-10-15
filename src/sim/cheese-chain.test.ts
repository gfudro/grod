import { describe, expect, it } from 'vitest';
import { createInitialState, houseGood, warehouseAmount, type Building, type GameState, type House } from './state';
import { tick } from './tick';
import { tryPlaceConstructionSite } from './placement';
import { houseCapacity, upgradeReadiness } from './houses';
import { tileKey, type Vec2 } from '../data/types';

// Layout west of the warehouse (8,9): a road along row 8 from x=2 to x=9.
const OBORA_TILE = { x: 3, y: 7 };
const SEROWARNIA_TILE = { x: 5, y: 7 };
const PLAC_TILE = { x: 6, y: 9 };
const HOUSE_TILE = { x: 3, y: 9 }; // 3 tiles from the plac — just inside its range

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

function addChata(state: GameState, extra: Partial<House> = {}): House {
  const house: House = {
    id: 'dom-test',
    tile: HOUSE_TILE,
    tier: 1,
    residents: 5,
    goods: {},
    upgrade: null,
    ...extra,
  };
  state.houses.push(house);
  return house;
}

describe('obora → serowarnia', () => {
  it('milks cows at the obora and turns the milk into ser at the serowarnia', () => {
    const state = withRoad();
    state.warehouse.drewno = 20;
    state.warehouse.glina = 10;
    expect(tryPlaceConstructionSite(state, 'obora', OBORA_TILE)).toBe(true);
    expect(tryPlaceConstructionSite(state, 'serowarnia', SEROWARNIA_TILE)).toBe(true);

    runTicks(state, 1500);

    expect(state.sites).toHaveLength(0);
    expect(warehouseAmount(state, 'ser')).toBeGreaterThan(0);
    // The cheesemaker took milk from the warehouse rather than conjuring it.
    const obora = state.buildings.find((b) => b.type === 'obora')!;
    expect(obora.workerId).not.toBeNull();
  });

  it('the cheesemaker waits by the serowarnia, showing mleko, while there is no milk', () => {
    const state = withRoad();
    addBuilding(state, 'serowarnia', SEROWARNIA_TILE);

    runTicks(state, 100);

    const worker = state.villagers.find((v) => v.job.kind === 'process')!;
    expect(worker.motion).toBe('waiting');
    expect(worker.waitingFor).toBe('mleko');
  });
});

describe('chata → zagroda', () => {
  function readyChata(state: GameState): House {
    state.warehouse.drewno = 4;
    state.warehouse.glina = 3;
    return addChata(state, { goods: { ryba: 5, kasza: 3, ser: 3 } });
  }

  it('tragarze bring ser to a chata — it is what the chata needs to grow', () => {
    const state = withRoad();
    state.warehouse.ser = 5;
    const house = addChata(state, { goods: { ryba: 5, kasza: 3 } });

    runTicks(state, 400);

    expect(houseGood(house, 'ser')).toBe(3);
    expect(warehouseAmount(state, 'ser')).toBe(2);
  });

  it('grows into a zagroda once it has ser and a plac wiecowy in range', () => {
    const state = withRoad();
    const house = readyChata(state);
    addBuilding(state, 'plac', PLAC_TILE);

    tick(state);
    expect(house.upgrade).not.toBeNull();
    expect(warehouseAmount(state, 'drewno')).toBe(0);
    expect(warehouseAmount(state, 'glina')).toBe(0);

    runTicks(state, 1200);
    expect(house.tier).toBe(2);
    expect(houseCapacity(house)).toBe(8);
    expect(state.chronicle.some((e) => e.kind === 'pierwsza-zagroda')).toBe(true);
  });

  it('a studnia is not enough: a chata needs the plac wiecowy', () => {
    const state = withRoad();
    const house = readyChata(state);
    addBuilding(state, 'studnia', PLAC_TILE);

    runTicks(state, 400);

    expect(house.tier).toBe(1);
    expect(house.upgrade).toBeNull();
    const ready = upgradeReadiness(state, house);
    expect(ready.service).toBe('plac');
    expect(ready.serviceInRange).toBe(false);
  });

  it('does not grow while ser is missing', () => {
    const state = withRoad();
    state.warehouse.drewno = 4;
    state.warehouse.glina = 3;
    const house = addChata(state, { goods: { ryba: 5, kasza: 3 } });
    addBuilding(state, 'plac', PLAC_TILE);

    runTicks(state, 400);

    expect(house.tier).toBe(1);
  });

  it('a zagroda eats ser, and grows on into a dwór', () => {
    const state = withRoad();
    const house = addChata(state, { tier: 2, residents: 8, goods: { ryba: 5, kasza: 3, ser: 3 } });

    runTicks(state, 600);

    expect(houseGood(house, 'ser')).toBeLessThan(3);
    expect(upgradeReadiness(state, house).service).toBe('kontyna');
  });
});
