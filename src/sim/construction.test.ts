import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type GameState } from './state';
import { tick } from './tick';
import { tryPlaceConstructionSite } from './placement';
import { buildersOn, MAX_BUILDERS } from './construction';
import { tileKey } from '../data/types';

function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  // A bigger crew than the starting three.
  for (let i = 0; i < 3; i++) state.villagers.push({ ...structuredClone(state.villagers[0]), id: `extra-${i}` });
  return state;
}

describe('several builders on one site', () => {
  it(`up to ${MAX_BUILDERS} free villagers carry materials to one site at once`, () => {
    const state = withRoad();
    state.warehouse = { drewno: 10, glina: 6 };
    tryPlaceConstructionSite(state, 'obora', { x: 4, y: 7 });
    const ref = { kind: 'build' as const, siteId: state.sites[0].id };

    tick(state);
    expect(buildersOn(state, ref)).toHaveLength(MAX_BUILDERS);
  });

  it('builds with exactly the paid materials: nothing extra carried, nothing lost', () => {
    const state = withRoad();
    state.warehouse = { drewno: 10, glina: 6 };
    tryPlaceConstructionSite(state, 'obora', { x: 4, y: 7 });

    for (let i = 0; i < 2000 && state.sites.length > 0; i++) tick(state);

    expect(state.buildings.map((b) => b.type)).toEqual(['obora']);
    expect(warehouseAmount(state, 'drewno')).toBe(0);
    expect(warehouseAmount(state, 'glina')).toBe(0);
    expect(state.villagers.filter((v) => v.carrying === 'drewno' || v.carrying === 'glina')).toHaveLength(0);
  });

  it('is faster than one builder alone', () => {
    const ticksToBuild = (crew: number): number => {
      const state = withRoad();
      state.villagers = state.villagers.slice(0, crew);
      state.warehouse = { drewno: 10, glina: 6 };
      tryPlaceConstructionSite(state, 'obora', { x: 4, y: 7 });
      let t = 0;
      while (state.sites.length > 0 && t < 5000) {
        tick(state);
        t++;
      }
      return t;
    };
    expect(ticksToBuild(3)).toBeLessThan(ticksToBuild(1) * 0.6);
  });

  it('every site gets a first builder before any site gets a second', () => {
    const state = withRoad();
    state.villagers = state.villagers.slice(0, 2);
    state.warehouse = { drewno: 20, glina: 12 };
    tryPlaceConstructionSite(state, 'obora', { x: 4, y: 7 });
    tryPlaceConstructionSite(state, 'obora', { x: 6, y: 7 });

    tick(state);
    for (const site of state.sites) {
      expect(buildersOn(state, { kind: 'build', siteId: site.id })).toHaveLength(1);
    }
  });
});
