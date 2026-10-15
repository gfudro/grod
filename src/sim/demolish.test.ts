import { describe, expect, it } from 'vitest';
import { BUILDINGS } from '../data/buildings';
import { tileKey } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { demolish } from './demolish';
import { canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { createInitialState, villagePopulation, warehouseAmount, type GameState } from './state';
import { tick } from './tick';

// A road along row 8, from x=2 to the warehouse (8,9).
function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 8; x++) state.roads.add(tileKey({ x, y: 8 }));
  return state;
}

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

/** Every unit of a resource in the gród: warehouse, sites, houses and hands. */
function totalOf(state: GameState, resource: 'drewno'): number {
  return (
    warehouseAmount(state, resource) +
    state.sites.reduce((n, s) => n + (s.delivered[resource] ?? 0), 0) +
    state.houses.reduce((n, h) => n + (h.goods[resource] ?? 0), 0) +
    state.villagers.filter((v) => v.carrying === resource).length
  );
}

describe('demolish', () => {
  it('a construction site gives back every material, also the ones carried back by hand', () => {
    const state = withRoad();
    const tile = { x: 4, y: 7 };
    // A bigger building, so some planks lie on site while others are still carried.
    state.warehouse.drewno = 10;
    state.warehouse.glina = 6;
    expect(tryPlaceConstructionSite(state, 'obora', tile)).toBe(true);
    // Run until a builder is on the way with a plank, and some lie on site.
    for (let i = 0; i < 400; i++) {
      tick(state);
      const site = state.sites[0];
      if ((site.delivered.drewno ?? 0) >= 1 && state.villagers.some((v) => v.carrying === 'drewno')) break;
    }
    const builder = state.villagers.find((v) => v.carrying === 'drewno');
    expect(builder).toBeDefined();

    expect(demolish(state, state.sites[0].id)).toBe(true);
    expect(state.sites).toHaveLength(0);
    expect(builder!.job.kind).toBe('idle');
    // The plank in the builder's hands still counts, and is walked home.
    expect(totalOf(state, 'drewno')).toBe(10);
    runTicks(state, 300);
    expect(builder!.carrying).toBeNull();
    expect(warehouseAmount(state, 'drewno')).toBe(10);
    expect(warehouseAmount(state, 'glina')).toBe(6);
    expect(canPlaceBuildingAt(state, 'drwal', tile)).toBe(true);
  });

  it('a finished building gives back its cost and frees its worker', () => {
    const state = withRoad();
    expect(tryPlaceConstructionSite(state, 'glinianka', { x: 4, y: 7 })).toBe(true);
    runTicks(state, 400);
    const building = state.buildings[0];
    expect(building.workerId).not.toBeNull();
    const worker = state.villagers.find((v) => v.id === building.workerId)!;
    const before = warehouseAmount(state, 'drewno');

    expect(demolish(state, building.id)).toBe(true);
    expect(state.buildings).toHaveLength(0);
    expect(warehouseAmount(state, 'drewno')).toBe(before + BUILDINGS.glinianka.cost.drewno!);
    expect(worker.job.kind).toBe('idle');
    runTicks(state, 300);
    expect(worker.carrying).toBeNull(); // any clay in hand was walked to the warehouse
  });

  it('a farmer standing in a demolished field walks off it instead of getting stuck', () => {
    const state = withRoad();
    state.warehouse.drewno = 20;
    const anchor = { x: 4, y: 6 }; // 2×2 field over rows 6–7; only row 7 touches the road
    expect(tryPlaceConstructionSite(state, 'pole', anchor)).toBe(true);
    // Run until the farmer is sowing the far (top) row of the field.
    let farmer;
    for (let i = 0; i < 1500 && !farmer; i++) {
      tick(state);
      farmer = state.villagers.find((v) => v.job.kind === 'farm' && v.from.y === 6 && v.motion !== 'walking');
    }
    expect(farmer).toBeDefined();

    demolish(state, state.buildings[0].id);
    runTicks(state, 300);
    expect(farmer!.from).toEqual(WAREHOUSE_TILE);
  });

  it('a house gives back its cost and goods, and nobody leaves the gród', () => {
    const state = withRoad();
    state.houses.push({
      id: 'dom-test',
      tile: { x: 4, y: 7 },
      tier: 1,
      residents: 3,
      goods: { ryba: 2, drewno: 1 },
      upgrade: null,
    });
    const people = villagePopulation(state);

    expect(demolish(state, 'dom-test')).toBe(true);
    expect(state.houses).toHaveLength(0);
    // ziemianka 4 + upgrade to chata 5 + firewood 1, on top of the starting 6
    expect(warehouseAmount(state, 'drewno')).toBe(6 + 4 + 5 + 1);
    expect(warehouseAmount(state, 'glina')).toBe(3);
    expect(warehouseAmount(state, 'ryba')).toBe(2);
    expect(villagePopulation(state)).toBe(people);
  });

  it('never touches the warehouse or anything unknown', () => {
    const state = withRoad();
    expect(demolish(state, 'magazyn')).toBe(false);
    expect(demolish(state, 'nope')).toBe(false);
  });
});
