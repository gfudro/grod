import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type GameState } from './state';
import { tick } from './tick';
import { eraseRoads, pathBackToRoad, restoreRoads } from './roads';
import { tryPlaceConstructionSite } from './placement';
import { tileKey } from '../data/types';

function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  return state;
}

describe('GUMKA: erasing roads', () => {
  it('takes away only tiles that were roads, and COFNIJ puts them back', () => {
    const state = withRoad();
    const erased = eraseRoads(state, ['4,8', '5,8', '5,5']);
    expect(erased).toEqual(['4,8', '5,8']);
    expect(state.roads.has('4,8')).toBe(false);

    restoreRoads(state, erased);
    expect(state.roads.has('4,8')).toBe(true);
    expect(state.roads.has('5,8')).toBe(true);
  });

  it('COFNIJ does not put a road back where something was built meanwhile', () => {
    const state = withRoad();
    const erased = eraseRoads(state, ['4,8']);
    state.warehouse.drewno = 4;
    expect(tryPlaceConstructionSite(state, 'ziemianka', { x: 4, y: 8 })).toBe(true);
    restoreRoads(state, erased);
    expect(state.roads.has('4,8')).toBe(false);
  });

  it('a building cut off from the road stops working, and works again when the road returns', () => {
    const state = withRoad();
    state.warehouse.drewno = 2;
    tryPlaceConstructionSite(state, 'glinianka', { x: 3, y: 7 });
    for (let i = 0; i < 600; i++) tick(state);
    const before = warehouseAmount(state, 'glina');
    expect(before).toBeGreaterThan(0);

    // Cut the road between the glinianka and the warehouse.
    const erased = eraseRoads(state, ['5,8', '6,8']);
    for (let i = 0; i < 600; i++) tick(state);
    const cut = warehouseAmount(state, 'glina');
    expect(cut - before).toBeLessThanOrEqual(1); // at most the load already past the gap

    restoreRoads(state, erased);
    for (let i = 0; i < 600; i++) tick(state);
    expect(warehouseAmount(state, 'glina')).toBeGreaterThan(cut);
  });

  it('whoever stood on an erased road walks over the grass to the nearest road', () => {
    const state = withRoad();
    const villager = state.villagers[0];
    villager.from = { x: 4, y: 8 };
    villager.to = { x: 4, y: 8 };
    eraseRoads(state, ['4,8', '3,8', '2,8']);

    const path = pathBackToRoad(state, villager.from);
    expect(path).toEqual([{ x: 5, y: 8 }]);
    for (let i = 0; i < 100; i++) tick(state);
    expect(villager.motion).not.toBe('waiting');
  });

  it('someone walking over a tile that is erased finishes the step and finds a new way', () => {
    const state = withRoad();
    const villager = state.villagers[0];
    villager.from = { x: 3, y: 8 };
    villager.to = { x: 4, y: 8 };
    villager.path = [{ x: 4, y: 8 }, { x: 5, y: 8 }, { x: 6, y: 8 }];
    villager.motion = 'walking';
    eraseRoads(state, ['6,8']);
    expect(villager.path).toEqual([{ x: 4, y: 8 }]);
  });
});
