import { describe, expect, it } from 'vitest';
import { createInitialState } from './state';
import { tick } from './tick';
import { tileKey } from '../data/types';
import { WAREHOUSE_TILE, SECOND_WAYPOINT } from '../data/waypoints';

/** An L-shaped road connecting the warehouse to the second waypoint, all on 'trawa'. */
function connectEndpointsWithRoad(roads: Set<string>): void {
  for (let x = SECOND_WAYPOINT.x; x <= WAREHOUSE_TILE.x; x++) {
    roads.add(tileKey({ x, y: WAREHOUSE_TILE.y }));
  }
  for (let y = WAREHOUSE_TILE.y; y <= SECOND_WAYPOINT.y; y++) {
    roads.add(tileKey({ x: SECOND_WAYPOINT.x, y }));
  }
}

describe('tick', () => {
  it('leaves the villager waiting when no road connects the two points', () => {
    const state = createInitialState();
    for (let i = 0; i < 50; i++) tick(state);
    expect(state.villager.motion).toBe('waiting');
    expect(state.villager.from).toEqual(WAREHOUSE_TILE);
  });

  it('walks the villager to the second waypoint once a road connects them', () => {
    const state = createInitialState();
    connectEndpointsWithRoad(state.roads);

    // 7-tile L-shaped route * 10 ticks/tile = exactly 70 ticks to arrive;
    // the villager heads straight back out, so check right at arrival.
    for (let i = 0; i < 70; i++) tick(state);

    expect(state.villager.from).toEqual(SECOND_WAYPOINT);
    expect(state.villager.targetIndex).toBe(0); // now heading back to the warehouse
  });

  it('shuttles back to the warehouse on the return leg', () => {
    const state = createInitialState();
    connectEndpointsWithRoad(state.roads);

    for (let i = 0; i < 140; i++) tick(state);

    expect(state.villager.from).toEqual(WAREHOUSE_TILE);
    expect(state.villager.targetIndex).toBe(1);
  });

  it('is deterministic for the same starting state', () => {
    const a = createInitialState(7);
    const b = createInitialState(7);
    connectEndpointsWithRoad(a.roads);
    connectEndpointsWithRoad(b.roads);

    for (let i = 0; i < 123; i++) {
      tick(a);
      tick(b);
    }

    expect(a.villager).toEqual(b.villager);
    expect(a.tick).toBe(b.tick);
  });
});
