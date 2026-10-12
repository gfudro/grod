import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount } from './state';
import { canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { findResourceTile } from './resource-tiles';
import { WAREHOUSE_TILE } from '../data/waypoints';

describe('canPlaceBuildingAt range limit', () => {
  it('refuses a drwal placed far from any tree', () => {
    const state = createInitialState();
    // Far corner of the map, well outside the forest (top-left) range.
    expect(canPlaceBuildingAt(state, 'drwal', { x: 19, y: 13 })).toBe(false);
  });

  it('allows a drwal placed close enough to a tree', () => {
    const state = createInitialState();
    const nearestTree = findResourceTile({ x: 6, y: 4 }, 'drzewo');
    expect(nearestTree).not.toBeNull();
    expect(canPlaceBuildingAt(state, 'drwal', { x: 6, y: 4 })).toBe(true);
  });

  it('has no range limit for glinianka, which gathers on its own tile', () => {
    const state = createInitialState();
    expect(canPlaceBuildingAt(state, 'glinianka', { x: 19, y: 13 })).toBe(true);
  });

  it('tryPlaceConstructionSite refuses an out-of-range drwal and keeps the stock', () => {
    const state = createInitialState();
    const startingWood = warehouseAmount(state, 'drewno');
    const placed = tryPlaceConstructionSite(state, 'drwal', { x: 19, y: 13 });
    expect(placed).toBe(false);
    expect(state.sites).toHaveLength(0);
    expect(warehouseAmount(state, 'drewno')).toBe(startingWood);
  });
});

describe('rybak resource tile', () => {
  it('finds a nearby water tile from anywhere near the river', () => {
    expect(findResourceTile(WAREHOUSE_TILE, 'woda')).not.toBeNull();
  });
});
