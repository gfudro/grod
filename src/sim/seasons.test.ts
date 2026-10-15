import { describe, expect, it } from 'vitest';
import { createInitialState, houseGood, type Building, type GameState, type House } from './state';
import { tick, TICKS_PER_TILE } from './tick';
import { currentSeason, currentYear, daysUntilWinter, winterShortfall, winterWarning } from './seasons';
import { SEASON_TICKS, DAYS_PER_SEASON } from '../data/seasons';
import { FIREWOOD } from '../data/houses';
import { tileKey } from '../data/types';

const HOUSE_TILE = { x: 8, y: 7 };

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function withHouse(extra: Partial<House> = {}): { state: GameState; house: House } {
  const state = createInitialState();
  state.roads.add(tileKey({ x: 8, y: 8 }));
  const house: House = { id: 'dom-test', tile: HOUSE_TILE, tier: 0, residents: 3, goods: {}, upgrade: null, ...extra };
  state.houses.push(house);
  return { state, house };
}

describe('calendar', () => {
  it('goes spring → summer → autumn → winter → spring of the next year', () => {
    const state = createInitialState();
    expect(currentSeason(state)).toBe('wiosna');
    expect(currentYear(state)).toBe(1);

    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      runTicks(state, SEASON_TICKS);
      seen.push(currentSeason(state));
    }
    expect(seen).toEqual(['lato', 'jesien', 'zima', 'wiosna']);
    expect(currentYear(state)).toBe(2);
  });

  it('counts the days left until winter', () => {
    const state = createInitialState();
    expect(daysUntilWinter(state)).toBe(DAYS_PER_SEASON * 3);
    state.tick = SEASON_TICKS * 3 - 1; // last tick of autumn
    expect(daysUntilWinter(state)).toBe(1);
    state.tick = SEASON_TICKS * 3;
    expect(daysUntilWinter(state)).toBe(0);
  });
});

describe('houses eating', () => {
  it('an occupied ziemianka eats a fish every so often, and the counter drops', () => {
    const { state, house } = withHouse({ goods: { ryba: 5 } });
    state.villagers = []; // no tragarze refilling it

    runTicks(state, 300);
    expect(houseGood(house, 'ryba')).toBe(4);
    runTicks(state, 300);
    expect(houseGood(house, 'ryba')).toBe(3);
  });

  it('an empty house eats nothing', () => {
    const { state, house } = withHouse({ residents: 0, goods: { ryba: 5 } });
    state.villagers = [];
    runTicks(state, 900);
    expect(houseGood(house, 'ryba')).toBe(5);
  });

  it('a chata also eats kasza; a ziemianka keeps its kasza for growing', () => {
    const chata = withHouse({ tier: 1, goods: { ryba: 5, kasza: 3 } });
    const ziemianka = withHouse({ goods: { ryba: 5, kasza: 2 } });
    for (const { state } of [chata, ziemianka]) state.villagers = [];
    runTicks(chata.state, 600);
    runTicks(ziemianka.state, 600);
    expect(houseGood(chata.house, 'kasza')).toBe(2);
    expect(houseGood(ziemianka.house, 'kasza')).toBe(2);
  });
});

describe('firewood', () => {
  it('is not delivered in spring', () => {
    const { state, house } = withHouse({ goods: { ryba: 5 } });
    state.warehouse.drewno = 10;
    runTicks(state, 200);
    expect(houseGood(house, 'drewno')).toBe(0);
  });

  it('is stacked at houses from autumn on, then burned through the winter', () => {
    const { state, house } = withHouse({ goods: { ryba: 5 } });
    state.tick = SEASON_TICKS * 2; // autumn
    state.warehouse.drewno = FIREWOOD.target;
    state.warehouse.ryba = 50;

    runTicks(state, 300);
    expect(houseGood(house, 'drewno')).toBe(FIREWOOD.target);

    runTicks(state, SEASON_TICKS * 3 - state.tick + FIREWOOD.burnEvery); // into winter
    expect(currentSeason(state)).toBe('zima');
    expect(houseGood(house, 'drewno')).toBeLessThan(FIREWOOD.target);
  });

  it('a house out of firewood in winter keeps new settlers away', () => {
    const { state, house } = withHouse({ residents: 1, goods: { ryba: 5 } });
    state.tick = SEASON_TICKS * 3; // winter
    for (let y = 9; y < 14; y++) state.roads.add(tileKey({ x: 8, y })); // road to the south edge
    state.warehouse.ryba = 50;
    state.warehouse.drewno = 0; // nothing to burn
    const before = state.villagers.length;

    runTicks(state, 200);

    expect(house.residents).toBe(1);
    expect(state.villagers.length).toBe(before);
  });
});

describe('rybak in winter', () => {
  function fishAfter(startTick: number): number {
    const state = createInitialState();
    for (let x = 8; x <= 10; x++) state.roads.add(tileKey({ x, y: 8 }));
    const rybak: Building = {
      id: 'budynek-rybak',
      type: 'rybak',
      tile: { x: 10, y: 7 },
      resourceTile: { x: 10, y: 8 },
      workerId: null,
      paused: false,
    };
    state.buildings.push(rybak);
    state.tick = startTick;
    runTicks(state, 600);
    return state.warehouse.ryba ?? 0;
  }

  it('catches fewer fish in winter than in summer', () => {
    expect(fishAfter(SEASON_TICKS * 3)).toBeLessThan(fishAfter(SEASON_TICKS));
    expect(fishAfter(SEASON_TICKS * 3)).toBeGreaterThan(0);
  });
});

describe('winter warning', () => {
  it('shows in autumn when stores are short, with the missing goods', () => {
    const { state } = withHouse({ goods: { ryba: 5 } });
    state.tick = SEASON_TICKS * 2 + 10;
    state.warehouse.drewno = 0;
    expect(winterWarning(state)).toEqual({ days: DAYS_PER_SEASON, missing: ['ryba', 'drewno'] });
  });

  it('goes away once there is enough fish and firewood put by', () => {
    const { state } = withHouse({ goods: { ryba: 5 } });
    state.tick = SEASON_TICKS * 2 + 10;
    state.warehouse.ryba = 5;
    state.warehouse.drewno = 4;
    expect(winterShortfall(state)).toEqual([]);
    expect(winterWarning(state)).toBeNull();
  });

  it('is not shown outside autumn', () => {
    const { state } = withHouse();
    expect(winterWarning(state)).toBeNull();
  });
});

describe('walking in winter', () => {
  /** Ticks a free villager takes to walk one tile east along a road, starting at `startTick`. */
  function ticksForOneTile(startTick: number): number {
    const state = createInitialState();
    state.tick = startTick;
    for (let x = 8; x <= 12; x++) state.roads.add(tileKey({ x, y: 10 }));
    const villager = state.villagers[0];
    villager.from = { x: 8, y: 10 };
    villager.to = { x: 9, y: 10 };
    villager.path = [{ x: 9, y: 10 }];
    villager.motion = 'walking';
    villager.job = { kind: 'build', siteId: 'none', stage: 'toWarehouse' }; // keep runJob from steering
    let ticks = 0;
    while (villager.from.x === 8) {
      tick(state);
      ticks += 1;
    }
    return ticks;
  }

  it('is slower through the snow than in summer', () => {
    expect(ticksForOneTile(SEASON_TICKS)).toBe(TICKS_PER_TILE); // summer
    expect(ticksForOneTile(SEASON_TICKS * 3)).toBe(TICKS_PER_TILE * 1.5); // winter
  });
});
