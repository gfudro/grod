import { addChronicleEntry } from '../sim/chronicle';
import { currentYear } from '../sim/seasons';
import { createInitialState, type GameState } from '../sim/state';
import { loadSaveFile, toSaveFile } from './save-file';
import { archiveCurrentSave, readCurrentSave, writeCurrentSave } from './storage';

export interface BootResult {
  state: GameState;
  /**
   * False when the stored save comes from a newer game version (e.g. an
   * old cached copy of the game was opened): we play without saving so
   * the newer save is left untouched for the newer version.
   */
  canSave: boolean;
}

/** Loads the current save, or starts a new game. Never drops a save on the floor. */
export async function bootGame(): Promise<BootResult> {
  let raw: unknown;
  try {
    raw = await readCurrentSave();
  } catch {
    return { state: createInitialState(), canSave: true }; // no IndexedDB (private mode)
  }
  if (raw === undefined) return { state: createInitialState(), canSave: true };

  const result = loadSaveFile(raw);
  if (result.ok) return { state: result.state, canSave: true };
  if (result.reason === 'from-the-future') return { state: createInitialState(), canSave: false };

  // The save can't be carried over: keep the whole record in the archive
  // and let the new gród remember the old one in its chronicle.
  await archiveCurrentSave();
  const state = createInitialState();
  addChronicleEntry(state, 'dawny-grod', { name: result.name });
  return { state, canSave: true };
}

export async function saveGame(state: GameState, gameVersion: string): Promise<void> {
  await writeCurrentSave(toSaveFile(state, gameVersion, new Date()));
}

export function saveFileName(state: GameState): string {
  const slug =
    state.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/ł/g, 'l')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'grod';
  return `${slug}-rok-${currentYear(state)}.json`;
}

/** Hands the save to the player as a file: the share sheet on iPad, a download elsewhere. */
export async function exportSave(state: GameState, gameVersion: string): Promise<void> {
  const json = JSON.stringify(toSaveFile(state, gameVersion, new Date()), null, 1);
  const file = new File([json], saveFileName(state), { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch {
      // cancelled or refused — fall back to a plain download
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Checks the file really is a loadable save, then makes it the current game. */
export async function importSave(file: File): Promise<boolean> {
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    return false;
  }
  if (!loadSaveFile(data).ok) return false;
  await archiveCurrentSave();
  await writeCurrentSave(data);
  return true;
}

/** Archives the current game; the next start begins a fresh one. */
export async function startNewGame(): Promise<void> {
  await archiveCurrentSave();
}
