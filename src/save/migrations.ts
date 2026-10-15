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
  /**
   * v5 (0.10.0): the zagroda tier, obora, serowarnia, plac wiecowy, mleko
   * and ser. The state's shape is unchanged — the bump keeps an older
   * cached copy of the game from loading buildings it doesn't know.
   */
  4: (save) => ({ ...save, saveVersion: 5 }),
  /**
   * v6 (0.11.0): the map grew from 20×14 to 36×26, east and south around
   * the old one, so every tile keeps its place. The old bottom edge (row
   * 13) is now inland, though: if the gród's only way in for settlers was
   * a road to that edge, it is carried straight on south to the new edge
   * (rows 14–25 below the old grass, columns 0–8, are open grass).
   */
  5: (save) => {
    const roads = Array.isArray(save.state.roads) ? (save.state.roads as string[]) : [];
    const tiles = roads.map((key) => key.split(',').map(Number) as [number, number]);
    // Grass on the edges of the old map, where settlers could walk in.
    const onOldEdge = (x: number, y: number, edgeY: number) => y === edgeY && x >= 0 && x <= 8;
    const reachesKeptEdge = tiles.some(([x, y]) => (y === 0 && x >= 0 && x <= 9) || (x === 0 && y >= 0 && y <= 13));
    const bottom = tiles.filter(([x, y]) => onOldEdge(x, y, 13)).sort((a, b) => b[0] - a[0])[0];
    if (reachesKeptEdge || !bottom) return { ...save, saveVersion: 6 };
    const extended = [...roads];
    for (let y = 14; y <= 25; y++) {
      const key = `${bottom[0]},${y}`;
      if (!extended.includes(key)) extended.push(key);
    }
    return { ...save, saveVersion: 6, state: { ...save.state, roads: extended } };
  },
  /**
   * v7 (0.13.0): summer storms, the kontyna Peruna, fires and ruins. No
   * storm is under way in an older save; houses gain their fire/ruin
   * fields lazily (absent = not burning, not burned).
   */
  6: (save) => ({ ...save, saveVersion: 7, state: { ...save.state, storms: [], lastStrike: null } }),
  /**
   * v8 (0.14.0): the dwór tier, owczarnia, tkalnia, wełna and ubrania. The
   * state's shape is unchanged — the bump keeps an older cached copy of
   * the game from loading buildings it doesn't know.
   */
  7: (save) => ({ ...save, saveVersion: 8 }),
  /**
   * v9 (0.15.0): the kopiec, kamieniarz, rudnik, dymarka and kuźnia, with
   * kamień, ruda, żelazo and łopaty. No gród had a kopiec before.
   */
  8: (save) => ({ ...save, saveVersion: 9, state: { ...save.state, mound: null } }),
  /**
   * v10 (0.16.0): several builders share a site, so sites, house rebuilds
   * and ruins no longer name one assigned worker — the builders are the
   * villagers whose job points at them, as before.
   */
  9: (save) => {
    const drop = (o: unknown): unknown => {
      if (typeof o !== 'object' || o === null) return o;
      const { assignedWorkerId: _dropped, ...rest } = o as Record<string, unknown>;
      return rest;
    };
    const sites = Array.isArray(save.state.sites) ? save.state.sites.map(drop) : save.state.sites;
    const houses = Array.isArray(save.state.houses)
      ? save.state.houses.map((h) => {
          const house = h as Record<string, unknown>;
          return {
            ...house,
            ...(house.upgrade ? { upgrade: drop(house.upgrade) } : {}),
            ...(house.rebuild ? { rebuild: drop(house.rebuild) } : {}),
          };
        })
      : save.state.houses;
    return { ...save, saveVersion: 10, state: { ...save.state, sites, houses } };
  },
};
