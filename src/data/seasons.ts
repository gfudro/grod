import type { BuildingType } from './buildings';

export type Season = 'wiosna' | 'lato' | 'jesien' | 'zima';

export const SEASON_ORDER: Season[] = ['wiosna', 'lato', 'jesien', 'zima'];

/** One season lasts 3 minutes at x1 (10 ticks per second). */
export const SEASON_TICKS = 1800;

/** Days shown in the winter countdown; a day is SEASON_TICKS / DAYS_PER_SEASON ticks (6 s at x1). */
export const DAYS_PER_SEASON = 30;
export const TICKS_PER_DAY = SEASON_TICKS / DAYS_PER_SEASON;

export interface SeasonDef {
  id: Season;
  /** Farmers may sow bare plots only in this season. */
  sowing: boolean;
  /** Houses keep a pile of firewood (drewno) topped up in this season. */
  stocksFirewood: boolean;
  /** Houses burn their firewood in this season. */
  burnsFirewood: boolean;
  /** Gathering takes this many times longer, per producer (e.g. ice on the river). */
  gatherMultiplier: Partial<Record<BuildingType, number>>;
  /** Crossing a tile takes this many times longer (wading through snow). */
  walkMultiplier: number;
}

/** GDD "Pory roku": spring sowing, summer growth, autumn harvest, winter firewood and slow walking in snow. */
export const SEASONS: Record<Season, SeasonDef> = {
  wiosna: { id: 'wiosna', sowing: true, stocksFirewood: false, burnsFirewood: false, gatherMultiplier: {}, walkMultiplier: 1 },
  lato: { id: 'lato', sowing: false, stocksFirewood: false, burnsFirewood: false, gatherMultiplier: {}, walkMultiplier: 1 },
  jesien: { id: 'jesien', sowing: false, stocksFirewood: true, burnsFirewood: false, gatherMultiplier: {}, walkMultiplier: 1 },
  zima: { id: 'zima', sowing: false, stocksFirewood: true, burnsFirewood: true, gatherMultiplier: { rybak: 3 }, walkMultiplier: 1.5 },
};
