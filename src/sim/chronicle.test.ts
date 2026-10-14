import { describe, expect, it } from 'vitest';
import { createInitialState, type GameState, type House } from './state';
import { tick } from './tick';
import { nameVillage } from './chronicle';
import { completeUpgrade } from './houses';
import { SEASON_TICKS } from '../data/seasons';
import { chronicleSentence } from '../ui/strings';

function runTicks(state: GameState, count: number): void {
  for (let i = 0; i < count; i++) tick(state);
}

function addHouse(state: GameState, extra: Partial<House> = {}): House {
  const house: House = { id: 'dom-test', tile: { x: 8, y: 7 }, tier: 0, residents: 3, goods: {}, upgrade: null, ...extra };
  state.houses.push(house);
  return house;
}

describe('chronicle', () => {
  it('starts with the founding of the gród', () => {
    const state = createInitialState();
    expect(state.chronicle).toEqual([{ year: 1, season: 'wiosna', kind: 'zalozenie', params: {} }]);
  });

  it('remembers the first chata only once', () => {
    const state = createInitialState();
    const a = addHouse(state);
    const b = addHouse(state, { id: 'dom-b' });
    completeUpgrade(state, a);
    completeUpgrade(state, b);
    expect(state.chronicle.filter((e) => e.kind === 'pierwsza-chata')).toHaveLength(1);
  });

  it('writes up a winter when spring comes, noting cold', () => {
    const state = createInitialState();
    state.villagers = [];
    addHouse(state, { goods: { ryba: 50 } });
    state.tick = SEASON_TICKS * 3; // winter, no firewood anywhere
    runTicks(state, SEASON_TICKS);
    const winter = state.chronicle.find((e) => e.kind === 'zima');
    expect(winter).toEqual({ year: 1, season: 'zima', kind: 'zima', params: { cold: true, hungry: false } });
  });

  it('records each new name', () => {
    const state = createInitialState();
    expect(nameVillage(state, '  Grodzisko ')).toBe(true);
    expect(state.name).toBe('Grodzisko');
    expect(nameVillage(state, 'Grodzisko')).toBe(false); // unchanged
    expect(nameVillage(state, '   ')).toBe(false);
    expect(state.chronicle.filter((e) => e.kind === 'nazwa')).toHaveLength(1);
  });
});

describe('chronicle sentences', () => {
  it('read like a chronicle', () => {
    expect(chronicleSentence({ year: 3, season: 'zima', kind: 'zima', params: { cold: false, hungry: false } })).toBe(
      'Roku trzeciego, zimą, gród przetrwał zimę w cieple i sytości.',
    );
    expect(chronicleSentence({ year: 1, season: 'lato', kind: 'osadnicy', params: { count: 1 } })).toBe(
      'Roku pierwszego, latem, przybył nowy osadnik.',
    );
    expect(chronicleSentence({ year: 1, season: 'lato', kind: 'osadnicy', params: { count: 3 } })).toContain('przybyli 3 osadnicy');
    expect(chronicleSentence({ year: 1, season: 'lato', kind: 'osadnicy', params: { count: 12 } })).toContain('przybyło 12 osadników');
    expect(chronicleSentence({ year: 20, season: 'wiosna', kind: 'zalozenie', params: {} })).toBe('Roku 20., wiosną, założono gród nad rzeką.');
  });
});
