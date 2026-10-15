import { describe, expect, it } from 'vitest';
import { createInitialState, warehouseAmount, type Building, type GameState, type House } from './state';
import { tick } from './tick';
import { currentSeason } from './seasons';
import { activeStorm, startRebuild } from './storms';
import { demolish } from './demolish';
import { SEASON_TICKS } from '../data/seasons';
import { RUINS_REBUILD, STORM } from '../data/storms';
import { tileKey, type Vec2 } from '../data/types';

// A road along row 8 from x=2 to x=9 touches the warehouse (8,9).
const HOUSE_TILE = { x: 5, y: 7 };
const WELL_TILE = { x: 3, y: 7 }; // 2 tiles west of the house: in range
const KONTYNA_TILE = { x: 6, y: 9 }; // in range

/** First tick of summer in year 2, the first summer with storms. */
const YEAR2_SUMMER = SEASON_TICKS * 5;

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function setup(): { state: GameState; house: House } {
  const state = createInitialState();
  for (let x = 2; x <= 9; x++) state.roads.add(tileKey({ x, y: 8 }));
  const house: House = { id: 'dom-test', tile: HOUSE_TILE, tier: 1, residents: 5, goods: { ryba: 5, kasza: 2 }, upgrade: null };
  state.houses.push(house);
  return { state, house };
}

function addBuilding(state: GameState, type: Building['type'], tile: Vec2): void {
  state.buildings.push({ id: `budynek-${type}`, type, tile, resourceTile: null, workerId: null, paused: false });
}

/** Puts the game at the start of year 2's summer with one storm about to appear. */
function stormComing(state: GameState): void {
  state.tick = YEAR2_SUMMER;
  state.storms = [{ appearTick: YEAR2_SUMMER + 1, strikeTick: YEAR2_SUMMER + 1, houseId: null }];
}

describe('planning storms', () => {
  it('keeps the first summer calm', () => {
    const { state } = setup();
    state.tick = SEASON_TICKS - 1;
    tick(state);
    expect(currentSeason(state)).toBe('lato');
    expect(state.storms).toHaveLength(0);
  });

  it('plans 2–3 storms for every later summer, all striking before autumn', () => {
    const { state } = setup();
    state.tick = YEAR2_SUMMER - 1;
    tick(state);
    expect(state.storms.length).toBeGreaterThanOrEqual(STORM.perSummer.min);
    expect(state.storms.length).toBeLessThanOrEqual(STORM.perSummer.max);
    for (const storm of state.storms) {
      expect(storm.appearTick).toBeGreaterThanOrEqual(YEAR2_SUMMER);
      expect(storm.strikeTick).toBeLessThan(YEAR2_SUMMER + SEASON_TICKS);
    }
  });
});

describe('a storm over an unguarded house', () => {
  it('hangs a cloud over the house, then the bolt sets it on fire', () => {
    const { state, house } = setup();
    stormComing(state);
    tick(state);
    expect(activeStorm(state)?.houseId).toBe(house.id);
    runTicks(state, STORM.warningTicks - 1);
    expect(house.fire).toBeFalsy(); // still only a warning
    tick(state);
    expect(house.fire).toBeTruthy();
    expect(state.lastStrike?.tile).toEqual(HOUSE_TILE);
  });

  it('burns down to ruins without a well, but nobody leaves and nothing else is lost', () => {
    const { state, house } = setup();
    stormComing(state);
    const people = state.villagers.length;
    runTicks(state, STORM.warningTicks + STORM.fireTicks + 2);
    expect(house.ruined).toBe(true);
    const fish = house.goods.ryba;
    runTicks(state, 1000);
    expect(house.fire).toBeFalsy();
    expect(house.tier).toBe(1); // never drops a tier
    expect(house.residents).toBe(5);
    expect(state.villagers.length).toBe(people);
    expect(house.goods.ryba).toBe(fish); // ruins don't eat; the goods wait for the rebuild
    expect(state.chronicle.some((e) => e.kind === 'pozar')).toBe(true);
  });

  it('is put out by buckets from a studnia in range', () => {
    const { state, house } = setup();
    addBuilding(state, 'studnia', WELL_TILE);
    stormComing(state);
    runTicks(state, STORM.warningTicks + 1);
    expect(house.fire).toBeTruthy();
    runTicks(state, 5);
    expect(state.villagers.some((v) => v.job.kind === 'douse')).toBe(true);
    runTicks(state, STORM.fireTicks);
    expect(house.fire).toBeFalsy();
    expect(house.ruined).toBeFalsy();
    expect(state.chronicle.some((e) => e.kind === 'ugaszony')).toBe(true);
    runTicks(state, 50);
    expect(state.villagers.some((v) => v.job.kind === 'douse')).toBe(false);
  });
});

describe('the kontyna Peruna', () => {
  it('takes the bolt, so the house never catches fire', () => {
    const { state, house } = setup();
    addBuilding(state, 'kontyna', KONTYNA_TILE);
    stormComing(state);
    runTicks(state, STORM.warningTicks + 2);
    expect(house.fire).toBeFalsy();
    expect(state.lastStrike?.tile).toEqual(KONTYNA_TILE);
    expect(state.chronicle.some((e) => e.kind === 'piorun-kontyna')).toBe(true);
  });
});

describe('ruins', () => {
  function burned(): { state: GameState; house: House } {
    const { state, house } = setup();
    house.ruined = true;
    return { state, house };
  }

  it('get no settlers and no deliveries', () => {
    const { state, house } = burned();
    house.residents = 0;
    house.goods = {};
    state.warehouse.ryba = 10;
    for (let y = 0; y <= 8; y++) state.roads.add(tileKey({ x: 2, y })); // way in from the north edge
    runTicks(state, 600);
    expect(house.residents).toBe(0);
    expect(house.goods.ryba ?? 0).toBe(0);
  });

  it('are rebuilt to the same tier after ODBUDUJ', () => {
    const { state, house } = burned();
    state.warehouse.drewno = 10;
    expect(startRebuild(state, house.id)).toBe(true);
    expect(warehouseAmount(state, 'drewno')).toBe(10 - RUINS_REBUILD.cost.drewno!);
    expect(startRebuild(state, house.id)).toBe(false); // already under way
    runTicks(state, 600);
    expect(house.ruined).toBe(false);
    expect(house.tier).toBe(1);
    expect(state.chronicle.some((e) => e.kind === 'odbudowa')).toBe(true);
  });

  it('cannot be rebuilt without the materials', () => {
    const { state, house } = burned();
    state.warehouse.drewno = 0;
    expect(startRebuild(state, house.id)).toBe(false);
    expect(house.rebuild).toBeFalsy();
  });

  it('give back only the goods when pulled down', () => {
    const { state, house } = burned();
    state.warehouse = {};
    expect(demolish(state, house.id)).toBe(true);
    expect(state.warehouse).toEqual({ ryba: 5, kasza: 2 });
  });
});
