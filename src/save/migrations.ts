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
};
