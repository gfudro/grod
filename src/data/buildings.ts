import type { ResourceType } from './resources';

export type BuildingType =
  | 'drwal'
  | 'rybak'
  | 'glinianka'
  | 'pole'
  | 'zarna'
  | 'studnia'
  | 'ziemianka'
  | 'obora'
  | 'serowarnia'
  | 'plac'
  | 'kontyna'
  | 'owczarnia'
  | 'tkalnia'
  | 'kamieniarz'
  | 'rudnik'
  | 'dymarka'
  | 'kuznia'
  | 'kopiec';

export type ResourceSearch = 'drzewo' | 'woda' | 'skala' | 'bagno' | 'na-miejscu';

/**
 * - produkcja: worker gathers a resource and carries it to the warehouse
 * - pole: farmer sows (spring) and harvests (autumn) the building's own field plots
 * - przetworstwo: worker fetches an input from the warehouse, processes it
 *   at the building and carries the output back
 * - usluga: no worker; serves houses within range while road-connected
 * - dom: a house (tier 0 of HOUSE_TIERS)
 * - kopiec: the mound, the goal of the game (data/mound.ts, sim/mound.ts) —
 *   never a construction site or a building, it lives in state.mound
 */
export type BuildingKind = 'produkcja' | 'pole' | 'przetworstwo' | 'usluga' | 'dom' | 'kopiec';

export interface Footprint {
  w: number;
  h: number;
}

export interface BuildingDef {
  id: BuildingType;
  name: string;
  kind: BuildingKind;
  cost: Partial<Record<ResourceType, number>>;
  /** Ticks a builder hammers once all materials are on site. */
  buildTicks: number;
  /** Tiles covered, anchored at the top-left tile. Defaults to 1×1. */
  footprint?: Footprint;

  // --- kind: 'produkcja', 'pole', 'przetworstwo' ---
  produces?: ResourceType;

  // --- kind: 'produkcja' only ---
  /** Ticks to gather one unit at the resource tile. */
  gatherTicks?: number;
  resourceSearch?: ResourceSearch;
  /**
   * Max tiles (Manhattan, as the crow flies) from the building to its
   * resource. Placement is refused beyond this range, so a drwal can't
   * be dropped on the far side of the map from any tree. Buildings that
   * gather 'na-miejscu' have no range — the resource is the site itself.
   */
  maxResourceRange?: number;

  // --- kind: 'pole' only ---
  /** Ticks the farmer spends sowing one plot. */
  sowTicks?: number;
  /** Ticks the farmer spends harvesting one unit from a ripe plot. */
  harvestTicks?: number;
  /** Units one ripe plot yields at harvest (one per trip to the warehouse). */
  plotYield?: number;

  // --- kind: 'przetworstwo' only ---
  consumes?: ResourceType;
  /** Ticks to turn one input unit into one output unit. */
  processTicks?: number;

  // --- kind: 'usluga' only ---
  /** Houses within this many tiles (square around the building) are served. */
  serviceRange?: number;
}

/**
 * Costs and timings are starting placeholders for balancing after
 * playtests (see GDD "Otwarte pytania").
 */
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  drwal: {
    id: 'drwal',
    name: 'DRWAL',
    kind: 'produkcja',
    cost: { drewno: 3 },
    buildTicks: 30,
    produces: 'drewno',
    gatherTicks: 20,
    resourceSearch: 'drzewo',
    maxResourceRange: 6,
  },
  rybak: {
    id: 'rybak',
    name: 'RYBAK',
    kind: 'produkcja',
    cost: { drewno: 3 },
    buildTicks: 30,
    produces: 'ryba',
    gatherTicks: 20,
    resourceSearch: 'woda',
    maxResourceRange: 6,
  },
  glinianka: {
    id: 'glinianka',
    name: 'GLINIANKA',
    kind: 'produkcja',
    cost: { drewno: 2 },
    buildTicks: 20,
    produces: 'glina',
    gatherTicks: 20,
    resourceSearch: 'na-miejscu',
  },
  pole: {
    id: 'pole',
    name: 'POLE',
    kind: 'pole',
    cost: { drewno: 2 },
    buildTicks: 30,
    footprint: { w: 2, h: 2 },
    produces: 'proso',
    sowTicks: 20,
    harvestTicks: 20,
    plotYield: 3,
  },
  zarna: {
    id: 'zarna',
    name: 'ŻARNA',
    kind: 'przetworstwo',
    cost: { drewno: 2, glina: 2 },
    buildTicks: 30,
    consumes: 'proso',
    produces: 'kasza',
    processTicks: 40,
  },
  studnia: {
    id: 'studnia',
    name: 'STUDNIA',
    kind: 'usluga',
    cost: { drewno: 1, glina: 2 },
    buildTicks: 30,
    serviceRange: 3,
  },
  obora: {
    id: 'obora',
    name: 'OBORA',
    kind: 'produkcja',
    cost: { drewno: 4, glina: 1 },
    buildTicks: 40,
    produces: 'mleko',
    // The cows live in the barn: milking happens on the spot.
    gatherTicks: 30,
    resourceSearch: 'na-miejscu',
  },
  serowarnia: {
    id: 'serowarnia',
    name: 'SEROWARNIA',
    kind: 'przetworstwo',
    cost: { drewno: 2, glina: 3 },
    buildTicks: 40,
    consumes: 'mleko',
    produces: 'ser',
    processTicks: 50,
  },
  owczarnia: {
    id: 'owczarnia',
    name: 'OWCZARNIA',
    kind: 'produkcja',
    cost: { drewno: 4, glina: 1 },
    buildTicks: 40,
    produces: 'welna',
    // The sheep live in the fold: shearing happens on the spot.
    gatherTicks: 30,
    resourceSearch: 'na-miejscu',
  },
  tkalnia: {
    id: 'tkalnia',
    name: 'TKALNIA',
    kind: 'przetworstwo',
    cost: { drewno: 3, glina: 3 },
    buildTicks: 50,
    consumes: 'welna',
    produces: 'ubrania',
    processTicks: 60,
  },
  plac: {
    id: 'plac',
    name: 'PLAC WIECOWY',
    kind: 'usluga',
    cost: { drewno: 3, glina: 1 },
    buildTicks: 30,
    serviceRange: 3,
  },
  kontyna: {
    id: 'kontyna',
    name: 'KONTYNA',
    kind: 'usluga',
    cost: { drewno: 4, glina: 2 },
    buildTicks: 40,
    // Perun takes every bolt aimed at a house in this range (see data/storms.ts),
    // and a zagroda needs it in this range to grow into a dwór.
    serviceRange: 4,
  },
  kamieniarz: {
    id: 'kamieniarz',
    name: 'KAMIENIARZ',
    kind: 'produkcja',
    cost: { drewno: 3 },
    buildTicks: 30,
    produces: 'kamien',
    gatherTicks: 30,
    resourceSearch: 'skala',
    maxResourceRange: 6,
  },
  rudnik: {
    id: 'rudnik',
    name: 'RUDNIK',
    kind: 'produkcja',
    cost: { drewno: 3 },
    buildTicks: 30,
    // Digs ruda darniowa (bog iron) out of the bagno.
    produces: 'ruda',
    gatherTicks: 30,
    resourceSearch: 'bagno',
    maxResourceRange: 6,
  },
  dymarka: {
    id: 'dymarka',
    name: 'DYMARKA',
    kind: 'przetworstwo',
    cost: { drewno: 2, glina: 4 },
    buildTicks: 40,
    consumes: 'ruda',
    produces: 'zelazo',
    processTicks: 60,
  },
  kuznia: {
    id: 'kuznia',
    name: 'KUŹNIA',
    kind: 'przetworstwo',
    cost: { drewno: 3, glina: 2, kamien: 2 },
    buildTicks: 50,
    consumes: 'zelazo',
    produces: 'lopaty',
    processTicks: 60,
  },
  kopiec: {
    id: 'kopiec',
    name: 'KOPIEC',
    kind: 'kopiec',
    // Nothing is paid up front: builders carry MOUND.cost over bit by bit.
    cost: {},
    buildTicks: 0,
    footprint: { w: 3, h: 3 },
  },
  ziemianka: {
    id: 'ziemianka',
    name: 'ZIEMIANKA',
    kind: 'dom',
    cost: { drewno: 4 },
    buildTicks: 40,
  },
};

export const BUILDING_ORDER: BuildingType[] = ['drwal', 'rybak', 'glinianka', 'ziemianka', 'pole', 'zarna', 'studnia', 'obora', 'serowarnia', 'plac', 'kontyna', 'owczarnia', 'tkalnia', 'kamieniarz', 'rudnik', 'dymarka', 'kuznia', 'kopiec'];

/** Starting warehouse stock, enough for one or two starter buildings. */
export const STARTING_WAREHOUSE_STOCK: Partial<Record<ResourceType, number>> = {
  drewno: 6,
};

/**
 * A small bootstrap crew already at the village when the game starts —
 * without them nobody could ever build the first house, since houses are
 * the only other source of workers (settlers walk in to fill them).
 */
export const STARTING_WORKER_POOL = 3;
