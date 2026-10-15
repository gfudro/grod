import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type GameState, type House } from './state';
import { tick } from './tick';
import { canAfford, canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { demolish, MOUND_ID } from './demolish';
import { moundBuilders, moundLayers, nameMound } from './mound';
import { inspectTile } from './inspect';
import { MOUND } from '../data/mound';
import { tileKey } from '../data/types';

// A road along row 8 (x 2–9) past the warehouse (8,9); the kopiec's
// 3×3 footprint (3..5, 5..7) sits on top of it.
const MOUND_TILE = { x: 3, y: 5 };

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withDwor(): GameState {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  const dwor: House = { id: 'dom-dwor', tile: { x: 7, y: 7 }, tier: 3, residents: 0, goods: {}, upgrade: null };
  state.houses.push(dwor);
  return state;
}

function stockAll(state: GameState): void {
  for (const [resource, amount] of Object.entries(MOUND.cost)) {
    state.warehouse[resource as keyof typeof MOUND.cost] = amount;
  }
}

describe('kopiec', () => {
  it('can only be marked out once the gród has a dwór', () => {
    const state = createInitialState();
    for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
    expect(canAfford(state, 'kopiec')).toBe(false);
    expect(tryPlaceConstructionSite(state, 'kopiec', MOUND_TILE)).toBe(false);

    const withHouse = withDwor();
    expect(canAfford(withHouse, 'kopiec')).toBe(true);
    expect(tryPlaceConstructionSite(withHouse, 'kopiec', MOUND_TILE)).toBe(true);
    expect(withHouse.mound).not.toBeNull();
    expect(withHouse.chronicle.some((e) => e.kind === 'kopiec-zaczety')).toBe(true);
  });

  it('costs nothing up front, takes 3×3 tiles and there is only one', () => {
    const state = withDwor();
    stockAll(state);
    expect(tryPlaceConstructionSite(state, 'kopiec', MOUND_TILE)).toBe(true);
    expect(warehouseAmount(state, 'kamien')).toBe(MOUND.cost.kamien);
    expect(canAfford(state, 'kopiec')).toBe(false);
    // Its footprint is taken now.
    expect(canPlaceBuildingAt(state, 'drwal', { x: 5, y: 7 })).toBe(false);
    expect(canPlaceBuildingAt(state, 'drwal', { x: 6, y: 7 })).toBe(true);
  });

  it('free villagers carry the materials over and it grows layer by layer', () => {
    const state = withDwor();
    stockAll(state);
    tryPlaceConstructionSite(state, 'kopiec', MOUND_TILE);
    const mound = state.mound!;

    runTicks(state, 300);
    expect(moundBuilders(state).length).toBeGreaterThan(0);
    expect(moundBuilders(state).length).toBeLessThanOrEqual(MOUND.maxBuilders);
    const early = moundLayers(mound);

    runTicks(state, 15000);
    expect(mound.done).toBe(true);
    expect(moundLayers(mound)).toBe(MOUND.layers);
    expect(moundLayers(mound)).toBeGreaterThan(early);
    // Exactly the cost went onto the mound — nothing extra, nothing lost.
    expect(mound.delivered).toEqual(MOUND.cost);
    expect(warehouseAmount(state, 'kamien')).toBe(0);
    expect(state.chronicle.some((e) => e.kind === 'kopiec-usypany')).toBe(true);
    expect(moundBuilders(state)).toHaveLength(0);
    expect(mound.celebrated).toBe(false); // the screen sets it when it opens
  });

  it('waiting for stone holds nobody up: the builders go back to the free pool', () => {
    const state = withDwor();
    state.warehouse.drewno = 3;
    tryPlaceConstructionSite(state, 'kopiec', MOUND_TILE);

    runTicks(state, 600);

    expect(state.mound!.delivered.drewno).toBe(3);
    expect(state.mound!.done).toBe(false);
    expect(moundBuilders(state)).toHaveLength(0);
    const info = inspectTile(state, { x: 4, y: 6 });
    expect(info?.kind).toBe('mound');
    if (info?.kind === 'mound') expect(info.missing).toEqual(['drewno', 'kamien', 'lopaty']);
  });

  it('ZBURZ gives back everything on the mound and in the builders’ hands', () => {
    const state = withDwor();
    stockAll(state);
    tryPlaceConstructionSite(state, 'kopiec', MOUND_TILE);
    runTicks(state, 400);
    expect(state.mound!.delivered.drewno ?? 0).toBeGreaterThan(0);

    expect(demolish(state, MOUND_ID)).toBe(true);
    expect(state.mound).toBeNull();
    runTicks(state, 400); // anything in hand is walked back to the warehouse

    for (const [resource, amount] of Object.entries(MOUND.cost)) {
      expect(warehouseAmount(state, resource as keyof typeof MOUND.cost)).toBe(amount);
    }
  });

  it('a finished kopiec stays: it cannot be pulled down, and Artur names it', () => {
    const state = withDwor();
    stockAll(state);
    tryPlaceConstructionSite(state, 'kopiec', MOUND_TILE);
    runTicks(state, 15000);
    expect(state.mound!.done).toBe(true);

    expect(demolish(state, MOUND_ID)).toBe(false);
    expect(nameMound(state, '  Kopiec Artura ')).toBe(true);
    expect(state.mound!.name).toBe('Kopiec Artura');
    expect(state.chronicle.at(-1)).toMatchObject({ kind: 'kopiec-nazwa', params: { name: 'Kopiec Artura' } });
  });
});
