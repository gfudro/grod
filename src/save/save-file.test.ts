import { describe, expect, it } from 'vitest';
import { createInitialState } from '../sim/state';
import { tick } from '../sim/tick';
import { tileKey } from '../data/types';
import { loadSaveFile, SAVE_VERSION, toSaveFile } from './save-file';
import { MIGRATIONS } from './migrations';
import { tutorialDone, tutorialHint } from '../sim/tutorial';

// Every file in tests/fixtures/saves/, picked up automatically: a new
// fixture is tested the moment it is added.
const FIXTURES = import.meta.glob('../../tests/fixtures/saves/*.json', { eager: true, import: 'default' });

function fixtureName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

function readFixture(name: string): unknown {
  const path = Object.keys(FIXTURES).find((p) => fixtureName(p) === name);
  if (!path) throw new Error(`no fixture ${name}`);
  // A fresh copy each time, so tests never share (and mutate) one object.
  return JSON.parse(JSON.stringify(FIXTURES[path]));
}

describe('every save ever written still loads (CLAUDE.md rule 6)', () => {
  const files = Object.keys(FIXTURES).map(fixtureName);

  it('has a fixture for every save version up to the current one', () => {
    const versions = new Set(files.map((f) => (readFixture(f) as { saveVersion: number }).saveVersion));
    for (let v = 1; v <= SAVE_VERSION; v++) expect(versions).toContain(v);
  });

  for (const file of files) {
    it(`${file} loads and keeps playing`, () => {
      const result = loadSaveFile(readFixture(file));
      if (!result.ok) throw new Error(`failed: ${result.reason}`);
      const { state } = result;
      expect(state.roads).toBeInstanceOf(Set);
      expect(state.roads.size).toBeGreaterThan(0);
      expect(state.chronicle.length).toBeGreaterThan(0);
      expect(typeof state.name).toBe('string');
      const tickBefore = state.tick;
      for (let i = 0; i < 2000; i++) tick(state);
      expect(state.tick).toBe(tickBefore + 2000);
    });
  }
});

describe('round trip', () => {
  it('a saved and loaded game plays on exactly like the original', () => {
    const original = createInitialState(7);
    for (let x = 2; x <= 9; x++) original.roads.add(tileKey({ x, y: 8 }));
    for (let i = 0; i < 500; i++) tick(original);

    const result = loadSaveFile(JSON.parse(JSON.stringify(toSaveFile(original, 'test', new Date()))));
    if (!result.ok) throw new Error(result.reason);
    const copy = result.state;
    expect(result.migratedFrom).toBe(SAVE_VERSION);

    for (let i = 0; i < 3000; i++) {
      tick(original);
      tick(copy);
    }
    const strip = (s: typeof original) => toSaveFile(s, 'test', new Date(0));
    expect(strip(copy)).toEqual(strip(original));
  });

  it('keeps the chronicle outside the state, so it survives on its own', () => {
    const state = createInitialState();
    const file = toSaveFile(state, 'test', new Date());
    expect(file.chronicle).toEqual(state.chronicle);
    expect('chronicle' in file.state).toBe(false);
  });
});

describe('migrations', () => {
  it('has one migration for every version below the current one', () => {
    for (let v = 1; v < SAVE_VERSION; v++) expect(MIGRATIONS[v]).toBeTypeOf('function');
  });

  it('v1 → v2 gives the gród an empty name and keeps everything else', () => {
    const v1 = readFixture('v1-rok1-lato.json') as { state: Record<string, unknown>; chronicle: unknown[] };
    expect('name' in v1.state).toBe(false);
    const result = loadSaveFile(v1);
    if (!result.ok) throw new Error(result.reason);
    expect(result.migratedFrom).toBe(1);
    expect(result.state.name).toBe('');
    expect(result.state.tick).toBe(v1.state.tick);
    expect(result.state.chronicle).toEqual(v1.chronicle);
  });
});

describe('migrations v2 → v3', () => {
  it('marks the tutorial done for games begun before it existed', () => {
    const result = loadSaveFile(readFixture('v2-rok2-wiosna.json'));
    if (!result.ok) throw new Error(result.reason);
    expect(result.migratedFrom).toBe(2);
    expect(tutorialDone(result.state)).toBe(true);
    expect(tutorialHint(result.state)).toBeNull();
  });

  it('gives the tutorial to an old save where nothing has been built yet', () => {
    const fresh = toSaveFile(createInitialState(), '0.7.3', new Date());
    const v2 = { ...fresh, saveVersion: 2, state: { ...fresh.state } as Record<string, unknown> };
    delete v2.state.tutorialStep;
    const result = loadSaveFile(JSON.parse(JSON.stringify(v2)));
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.tutorialStep).toBe(0);
  });

  it('a new game starts the tutorial, and a save mid-tutorial carries on where it was', () => {
    expect(createInitialState().tutorialStep).toBe(0);
    const result = loadSaveFile(readFixture('v3-rok1-wiosna-samouczek.json'));
    if (!result.ok) throw new Error(result.reason);
    expect(result.state.tutorialStep).toBe(1);
    expect(tutorialHint(result.state)).toMatchObject({ kind: 'build', type: 'rybak' });
  });
});

describe('saves that cannot be loaded', () => {
  it('refuses a save from a newer version of the game, and rescues its chronicle', () => {
    const future = { ...(readFixture('v2-rok2-wiosna.json') as object), saveVersion: SAVE_VERSION + 1 };
    const result = loadSaveFile(future);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('from-the-future');
    expect(result.chronicle.length).toBeGreaterThan(0);
    expect(result.name).toBe('Grodzisko');
  });

  it('refuses something that is not a save at all', () => {
    expect(loadSaveFile({ hello: 'world' })).toMatchObject({ ok: false, reason: 'not-a-save' });
    expect(loadSaveFile(null)).toMatchObject({ ok: false, reason: 'not-a-save' });
  });

  it('refuses a broken state but still rescues the chronicle', () => {
    const broken = { saveVersion: SAVE_VERSION, state: { tick: 'x' }, chronicle: [{ year: 1, season: 'wiosna', kind: 'zalozenie', params: {} }] };
    const result = loadSaveFile(broken);
    expect(result).toMatchObject({ ok: false, reason: 'broken-state' });
    if (!result.ok) expect(result.chronicle).toHaveLength(1);
  });
});
