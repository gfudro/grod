import { describe, expect, it } from 'vitest';
import { createInitialState, houseGood, warehouseAmount, type GameState, type House } from './state';
import { stepTicks, tick, ticksPerTile } from './tick';
import { activeBlizzard, comingBlizzard } from './blizzard';
import { consumeHouseGoods } from './seasons';
import { BLIZZARD } from '../data/blizzard';
import { SEASON_TICKS } from '../data/seasons';
import { FIREWOOD } from '../data/houses';
import { tileKey } from '../data/types';

const WINTER_YEAR_1 = 3 * SEASON_TICKS;
const WINTER_YEAR_2 = 7 * SEASON_TICKS;

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withRoad(): GameState {
  const state = createInitialState();
  for (let x = 0; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  for (let y = 0; y <= 7; y++) state.roads.add(tileKey({ x: 9, y }));
  return state;
}

/** Jumps to the tick before `at`, so the next tick starts that season for real. */
function jumpTo(state: GameState, at: number): void {
  state.tick = at - 1;
  tick(state);
}

/** Runs until the first blizzard of this winter blows. */
function untilBlowing(state: GameState): void {
  for (let i = 0; i < SEASON_TICKS && !activeBlizzard(state); i++) tick(state);
}

describe('śnieżyca', () => {
  it('the first winter is calm; from year 2 every winter brings one or two', () => {
    const calm = withRoad();
    jumpTo(calm, WINTER_YEAR_1);
    expect(calm.blizzards).toHaveLength(0);

    const state = withRoad();
    jumpTo(state, WINTER_YEAR_2);
    expect(state.blizzards.length).toBeGreaterThanOrEqual(BLIZZARD.perWinter.min);
    expect(state.blizzards.length).toBeLessThanOrEqual(BLIZZARD.perWinter.max);
    for (const b of state.blizzards) {
      expect(b.startTick - b.appearTick).toBe(BLIZZARD.warningTicks);
      expect(b.endTick).toBeLessThanOrEqual(WINTER_YEAR_2 + SEASON_TICKS);
    }
  });

  it('is announced days ahead, then everyone wades twice as slowly', () => {
    const state = withRoad();
    jumpTo(state, WINTER_YEAR_2);
    const normal = ticksPerTile(state);
    for (let i = 0; i < SEASON_TICKS && !comingBlizzard(state); i++) tick(state);
    expect(comingBlizzard(state)).not.toBeNull();
    expect(activeBlizzard(state)).toBeNull();

    untilBlowing(state);
    expect(ticksPerTile(state)).toBe(normal * BLIZZARD.walkMultiplier);
    expect(state.chronicle.some((e) => e.kind === 'sniezyca')).toBe(true);
  });

  it('makes houses burn their firewood twice as fast', () => {
    const state = withRoad();
    jumpTo(state, WINTER_YEAR_2);
    untilBlowing(state);
    const house: House = { id: 'dom', tile: { x: 3, y: 7 }, tier: 0, residents: 3, goods: { ryba: 5, drewno: 4 }, upgrade: null };
    state.houses.push(house);
    // Halfway between two ordinary burns, the blizzard burns an extra log.
    const b = activeBlizzard(state)!;
    const half = FIREWOOD.burnEvery / BLIZZARD.firewoodMultiplier;
    const at = Math.ceil(state.tick / FIREWOOD.burnEvery) * FIREWOOD.burnEvery + half;
    b.endTick = Math.max(b.endTick, at + 1); // long enough to reach that moment
    state.tick = at;
    expect(activeBlizzard(state)).not.toBeNull();
    consumeHouseGoods(state);
    expect(houseGood(house, 'drewno')).toBe(3);
  });

  it('piles drifts on half the roads, and a drift is slow to wade into', () => {
    const state = withRoad();
    jumpTo(state, WINTER_YEAR_2);
    untilBlowing(state);
    const b = activeBlizzard(state)!;
    runTicks(state, b.endTick - state.tick);
    expect(state.drifts.length).toBe(Math.floor(state.roads.size * BLIZZARD.driftShare));

    const v = state.villagers[0];
    const [x, y] = state.drifts[0].split(',').map(Number);
    v.to = { x, y };
    expect(stepTicks(state, v)).toBe(ticksPerTile(state) * BLIZZARD.driftWalkMultiplier);
  });

  it('villagers with łopaty dig the drifts out afterwards, and bring the łopaty back', () => {
    const state = withRoad();
    state.warehouse.lopaty = 2;
    jumpTo(state, WINTER_YEAR_2);
    untilBlowing(state);
    runTicks(state, activeBlizzard(state)!.endTick - state.tick);
    expect(state.drifts.length).toBeGreaterThan(0);

    // A digger takes a łopata out with them.
    runTicks(state, 5);
    expect(state.villagers.some((v) => v.job.kind === 'dig')).toBe(true);

    for (let i = 0; i < 2000 && state.drifts.length > 0; i++) tick(state);
    expect(state.drifts).toHaveLength(0);
    runTicks(state, 300);
    expect(warehouseAmount(state, 'lopaty')).toBe(2);
  });

  it('without łopaty the drifts stay until spring, then melt', () => {
    const state = withRoad();
    jumpTo(state, WINTER_YEAR_2);
    untilBlowing(state);
    runTicks(state, activeBlizzard(state)!.endTick - state.tick + 200);
    expect(state.drifts.length).toBeGreaterThan(0);
    expect(state.villagers.some((v) => v.job.kind === 'dig')).toBe(false);

    jumpTo(state, WINTER_YEAR_2 + SEASON_TICKS);
    expect(state.drifts).toHaveLength(0);
    expect(state.blizzards).toHaveLength(0);
  });
});
