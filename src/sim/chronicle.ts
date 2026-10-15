import type { Season } from '../data/seasons';
import { SEASON_ORDER, SEASON_TICKS } from '../data/seasons';
import type { GameState } from './state';

/**
 * Kinds of moments the chronicle remembers. The sentences live in
 * ui/strings.ts, so this data stays stable while the wording can change.
 */
export type ChronicleKind =
  | 'zalozenie'
  | 'nazwa'
  | 'pierwsza-ziemianka'
  | 'pierwsza-chata'
  | 'pierwsza-zagroda'
  | 'pierwszy-dwor'
  | 'pierwsze-zniwa'
  | 'osadnicy'
  | 'zima'
  /** Lightning set a house on fire and it burned down (params.tier). */
  | 'pozar'
  /** Lightning set a house on fire, but buckets from the studnia put it out. */
  | 'ugaszony'
  /** Lightning came down on the kontyna Peruna instead of a house. */
  | 'piorun-kontyna'
  /** Burned ruins were rebuilt (params.tier). */
  | 'odbudowa'
  /** A save that could not be carried over: the old gród lives on as history. */
  | 'dawny-grod';

export interface ChronicleEntry {
  year: number;
  season: Season;
  kind: ChronicleKind;
  params: Record<string, string | number | boolean>;
}

/** What happened during the current season, summed up when it ends. */
export interface SeasonLog {
  settlers: number;
  /** Some occupied house had no fish at some point. */
  hungry: boolean;
  /** Some occupied house had no firewood in winter at some point. */
  cold: boolean;
}

export function emptySeasonLog(): SeasonLog {
  return { settlers: 0, hungry: false, cold: false };
}

function dateOf(tick: number): { year: number; season: Season } {
  const seasonIndex = Math.floor(tick / SEASON_TICKS);
  return {
    year: Math.floor(seasonIndex / SEASON_ORDER.length) + 1,
    season: SEASON_ORDER[seasonIndex % SEASON_ORDER.length],
  };
}

export function addChronicleEntry(
  state: GameState,
  kind: ChronicleKind,
  params: ChronicleEntry['params'] = {},
  atTick = state.tick,
): void {
  state.chronicle.push({ ...dateOf(atTick), kind, params });
}

/** For one-off moments like the first chata: records only the first time. */
export function addChronicleFirst(state: GameState, kind: ChronicleKind): void {
  if (state.chronicle.some((e) => e.kind === kind)) return;
  addChronicleEntry(state, kind);
}

/**
 * Called on the first tick of a new season: writes up the season that
 * just ended (settlers who came, how the winter went) and starts afresh.
 */
export function closeSeasonLog(state: GameState): void {
  const endedAt = state.tick - 1;
  const ended = dateOf(endedAt).season;
  const log = state.seasonLog;
  if (log.settlers > 0) addChronicleEntry(state, 'osadnicy', { count: log.settlers }, endedAt);
  if (ended === 'zima' && state.houses.some((h) => h.residents > 0)) {
    addChronicleEntry(state, 'zima', { cold: log.cold, hungry: log.hungry }, endedAt);
  }
  state.seasonLog = emptySeasonLog();
}

/** Names (or renames) the gród; the chronicle remembers each name. */
export function nameVillage(state: GameState, name: string): boolean {
  const trimmed = name.trim().slice(0, 40);
  if (!trimmed || trimmed === state.name) return false;
  state.name = trimmed;
  addChronicleEntry(state, 'nazwa', { name: trimmed });
  return true;
}
