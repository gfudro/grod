import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { setBuildingPaused } from './building-control';

const BUILDING_TILE = { x: 6, y: 4 };

describe('setBuildingPaused', () => {
  it('frees the assigned worker immediately when paused', () => {
    const state = createInitialState();
    const worker = state.villagers[0];
    worker.job = { kind: 'produce', buildingId: 'budynek-test', stage: 'gathering' };
    worker.motion = 'idle';
    worker.carrying = null;
    state.buildings.push({
      id: 'budynek-test',
      type: 'drwal',
      tile: BUILDING_TILE,
      resourceTile: { x: 5, y: 3 },
      workerId: worker.id,
      paused: false,
    });

    setBuildingPaused(state, 'budynek-test', true);

    const building = state.buildings[0];
    expect(building.paused).toBe(true);
    expect(building.workerId).toBeNull();
    expect(worker.job).toEqual({ kind: 'idle' });
  });

  it('drops anything the freed worker was carrying, so it never gets stuck in their hands', () => {
    const state = createInitialState();
    const worker = state.villagers[0];
    worker.job = { kind: 'produce', buildingId: 'budynek-test', stage: 'toWarehouse' };
    worker.carrying = 'drewno';
    state.buildings.push({
      id: 'budynek-test',
      type: 'drwal',
      tile: BUILDING_TILE,
      resourceTile: { x: 5, y: 3 },
      workerId: worker.id,
      paused: false,
    });

    setBuildingPaused(state, 'budynek-test', true);

    expect(worker.carrying).toBeNull();
  });

  it('resuming makes the building eligible for a worker again without forcing one', () => {
    const state = createInitialState();
    state.buildings.push({
      id: 'budynek-test',
      type: 'drwal',
      tile: BUILDING_TILE,
      resourceTile: { x: 5, y: 3 },
      workerId: null,
      paused: true,
    });

    setBuildingPaused(state, 'budynek-test', false);

    expect(state.buildings[0].paused).toBe(false);
    expect(state.buildings[0].workerId).toBeNull(); // assignment happens on the next tick, not here
  });

  it('does nothing for an unknown building id', () => {
    const state = createInitialState();
    expect(() => setBuildingPaused(state, 'nope', true)).not.toThrow();
  });
});
