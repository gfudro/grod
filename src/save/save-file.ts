import { emptySeasonLog, type ChronicleEntry } from '../sim/chronicle';
import type { GameState } from '../sim/state';
import { MIGRATIONS, type RawSave } from './migrations';

/** Bump on every change to the shape of GameState, with a migration and a fixture. */
export const SAVE_VERSION = 2;

/** GameState as JSON: the roads Set becomes a list; the chronicle sits outside. */
type SerializedState = Omit<GameState, 'roads' | 'chronicle'> & { roads: string[] };

export interface SaveFile {
  saveVersion: number;
  gameVersion: string;
  savedAt: string;
  state: SerializedState;
  chronicle: ChronicleEntry[];
}

export function toSaveFile(state: GameState, gameVersion: string, savedAt: Date): SaveFile {
  const { roads, chronicle, ...rest } = state;
  return {
    saveVersion: SAVE_VERSION,
    gameVersion,
    savedAt: savedAt.toISOString(),
    // A deep copy, so the stored save never shares objects with the live game.
    state: JSON.parse(JSON.stringify({ ...rest, roads: [...roads] })) as SerializedState,
    chronicle: JSON.parse(JSON.stringify(chronicle)) as ChronicleEntry[],
  };
}

export type LoadResult =
  | { ok: true; state: GameState; migratedFrom: number }
  | {
      ok: false;
      reason: 'not-a-save' | 'from-the-future' | 'no-migration' | 'broken-state';
      /** Whatever of the chronicle could be rescued, so the history survives. */
      chronicle: ChronicleEntry[];
      name: string;
    };

function isRawSave(data: unknown): data is RawSave {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  return typeof d.saveVersion === 'number' && typeof d.state === 'object' && d.state !== null;
}

function rescueChronicle(data: unknown): ChronicleEntry[] {
  const list = (data as { chronicle?: unknown } | null)?.chronicle;
  if (!Array.isArray(list)) return [];
  return list.filter(
    (e): e is ChronicleEntry =>
      typeof e === 'object' && e !== null && typeof (e as ChronicleEntry).year === 'number' && typeof (e as ChronicleEntry).kind === 'string',
  );
}

function rescueName(data: unknown): string {
  const name = (data as { state?: { name?: unknown } } | null)?.state?.name;
  return typeof name === 'string' ? name : '';
}

/** Walks a save of any past version up to SAVE_VERSION and rebuilds the game state. */
export function loadSaveFile(data: unknown): LoadResult {
  const fail = (reason: Extract<LoadResult, { ok: false }>['reason']): LoadResult => ({
    ok: false,
    reason,
    chronicle: rescueChronicle(data),
    name: rescueName(data),
  });
  if (!isRawSave(data)) return fail('not-a-save');
  if (data.saveVersion > SAVE_VERSION) return fail('from-the-future');

  let save: RawSave = { ...data, chronicle: Array.isArray(data.chronicle) ? data.chronicle : [] };
  const migratedFrom = save.saveVersion;
  while (save.saveVersion < SAVE_VERSION) {
    const migrate = MIGRATIONS[save.saveVersion];
    if (!migrate) return fail('no-migration');
    save = migrate(save);
  }

  const s = save.state as Partial<SerializedState>;
  if (
    typeof s.tick !== 'number' ||
    !Array.isArray(s.roads) ||
    !Array.isArray(s.villagers) ||
    !Array.isArray(s.buildings) ||
    !Array.isArray(s.houses) ||
    !Array.isArray(s.sites) ||
    typeof s.warehouse !== 'object' ||
    typeof s.rng !== 'object'
  ) {
    return fail('broken-state');
  }
  const state: GameState = {
    ...(s as SerializedState),
    roads: new Set(s.roads),
    chronicle: rescueChronicle(save),
    seasonLog: s.seasonLog ?? emptySeasonLog(),
    name: typeof s.name === 'string' ? s.name : '',
  };
  return { ok: true, state, migratedFrom };
}
