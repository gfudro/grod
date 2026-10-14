/**
 * Save migrations, one per format bump: MIGRATIONS[n] turns a version-n
 * save into a version n+1 save. Never delete an old migration — every
 * save ever written must still walk up to the current version
 * (CLAUDE.md "Zapisy i kronika").
 */

/** A save file as stored, before we trust its shape. */
export interface RawSave {
  saveVersion: number;
  gameVersion: string;
  savedAt: string;
  state: Record<string, unknown>;
  chronicle: unknown[];
}

export const MIGRATIONS: Record<number, (save: RawSave) => RawSave> = {
  /** v2 (0.7.0): the gród gets a name, given by Artur. */
  1: (save) => ({
    ...save,
    saveVersion: 2,
    state: { ...save.state, name: '' },
  }),
  /**
   * v3 (0.8.0): the first-spring tutorial. Games begun before it existed
   * skip it (7 was the number of tutorial steps when v3 came out) — unless
   * nothing has been built yet, so a fresh gród still gets the tutorial.
   */
  2: (save) => {
    const empty = (key: string) => !Array.isArray(save.state[key]) || (save.state[key] as unknown[]).length === 0;
    const untouched = empty('buildings') && empty('sites') && empty('houses');
    return {
      ...save,
      saveVersion: 3,
      state: { ...save.state, tutorialStep: untouched ? 0 : 7 },
    };
  },
  /** v4 (0.8.2): the tutorial is gone again (Greg explains the game to Artur himself). */
  3: (save) => {
    const { tutorialStep: _dropped, ...state } = save.state;
    return { ...save, saveVersion: 4, state };
  },
};
