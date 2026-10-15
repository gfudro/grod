import { describe, expect, it } from 'vitest';
import { createInitialState, type Building, type GameState, type House, type VillagerState } from './state';
import { stepTicks, tick, ticksPerTile } from './tick';
import { hungerStage } from './hunger';
import { HUNGER } from '../data/hunger';
import { tileKey, type Vec2 } from '../data/types';

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  return state;
}

function addHouse(state: GameState, extra: Partial<House> = {}): House {
  const house: House = { id: 'dom-test', tile: { x: 3, y: 9 }, tier: 0, residents: 1, goods: {}, upgrade: null, ...extra };
  state.houses.push(house);
  return house;
}

/** A settler who lives in the house (the starting crew has no house and never goes hungry). */
function addResident(state: GameState, house: House): VillagerState {
  const v: VillagerState = { ...structuredClone(state.villagers[0]), id: 'osadnik-test', homeId: house.id };
  state.villagers.push(v);
  return v;
}

function addBuilding(state: GameState, type: Building['type'], tile: Vec2): Building {
  const building: Building = { id: `budynek-${type}`, type, tile, resourceTile: null, workerId: null, paused: false };
  state.buildings.push(building);
  return building;
}

describe('głód', () => {
  it('a settler moving in knows their home', () => {
    const state = withRoad();
    state.roads.add(tileKey({ x: 0, y: 8 }));
    state.roads.add(tileKey({ x: 1, y: 8 }));
    const house = addHouse(state, { residents: 0, goods: { ryba: 5 } });
    runTicks(state, 400);
    const settler = state.villagers.find((v) => v.id.startsWith('osadnik'))!;
    expect(settler.homeId).toBe(house.id);
  });

  it('gets worse in three steps without fish, and the first fish ends it', () => {
    const state = withRoad();
    const house = addHouse(state);
    const resident = addResident(state, house);
    state.villagers = [resident]; // nobody to bring fish

    tick(state);
    expect(hungerStage(state, resident)).toBe(1);
    runTicks(state, HUNGER.sadTicks);
    expect(hungerStage(state, resident)).toBe(2);
    runTicks(state, HUNGER.strikeTicks - HUNGER.sadTicks);
    expect(hungerStage(state, resident)).toBe(3);
    expect(state.chronicle.some((e) => e.kind === 'strajk-glodowy')).toBe(true);

    house.goods.ryba = 1;
    tick(state);
    expect(hungerStage(state, resident)).toBe(0);
  });

  it('hungry people walk and work slower; the starting crew never goes hungry', () => {
    const state = withRoad();
    const house = addHouse(state);
    const resident = addResident(state, house);
    tick(state);
    expect(stepTicks(state, resident)).toBe(Math.round(ticksPerTile(state) * HUNGER.slowMultiplier));
    expect(stepTicks(state, state.villagers[0])).toBe(ticksPerTile(state));
    expect(hungerStage(state, state.villagers[0])).toBe(0);
  });

  it('at the worst they leave their work and sit at home, and go back once fish arrives', () => {
    const state = withRoad();
    const house = addHouse(state);
    const resident = addResident(state, house);
    state.villagers = [resident];
    const glinianka = addBuilding(state, 'glinianka', { x: 5, y: 7 });
    runTicks(state, 100);
    expect(glinianka.workerId).toBe(resident.id);

    runTicks(state, HUNGER.strikeTicks + 200);
    expect(resident.job.kind).toBe('strike');
    expect(glinianka.workerId).toBeNull();
    expect(resident.from).toEqual(house.tile);
    expect(resident.carrying).toBeNull();

    house.goods.ryba = 3;
    runTicks(state, 100);
    expect(resident.job.kind).not.toBe('strike');
  });

  it('a hungry rybak keeps fishing, so the gród can always feed itself again', () => {
    const state = withRoad();
    const house = addHouse(state);
    const resident = addResident(state, house);
    state.villagers = [resident];
    const rybak = addBuilding(state, 'rybak', { x: 9, y: 7 });
    rybak.resourceTile = { x: 11, y: 7 };
    runTicks(state, HUNGER.strikeTicks + 300);
    expect(resident.job.kind).toBe('produce');
  });

  it('a hungry house gets fish before anything else is built', () => {
    const state = withRoad();
    const house = addHouse(state);
    state.warehouse = { drewno: 30, ryba: 5 };
    state.sites.push({ id: 'plac-x', type: 'drwal', tile: { x: 6, y: 7 }, delivered: {} });
    tick(state);
    expect(state.villagers.some((v) => v.job.kind === 'deliver' && v.job.houseId === house.id)).toBe(true);
  });
});
