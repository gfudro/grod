import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { tick } from './tick';
import { inspectTile } from './inspect';
import { tileKey } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';

describe('tapping a tile', () => {
  it('shows the building, not the worker waiting inside it, so it can be paused', () => {
    const state = createInitialState();
    for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
    state.buildings.push({ id: 'ser', type: 'serowarnia', tile: { x: 5, y: 7 }, resourceTile: null, workerId: null, paused: false });
    for (let i = 0; i < 100; i++) tick(state);

    const worker = state.villagers.find((v) => v.job.kind === 'process')!;
    expect(worker.from).toEqual({ x: 5, y: 7 });
    expect(worker.motion).toBe('waiting'); // no milk in the warehouse

    const info = inspectTile(state, { x: 5, y: 7 });
    expect(info).toMatchObject({ kind: 'building', id: 'ser', workerWaitingFor: 'mleko' });
  });

  it('still shows a villager tapped on a road', () => {
    const state = createInitialState();
    state.villagers[0].from = { x: 6, y: 8 };
    state.villagers[0].to = { x: 6, y: 8 };
    expect(inspectTile(state, { x: 6, y: 8 })).toMatchObject({ kind: 'villager' });
    expect(inspectTile(state, WAREHOUSE_TILE)).toMatchObject({ kind: 'warehouse' });
  });
});
