import type { ResourceType } from './resources';

export type BuildingType = 'drwal' | 'rybak' | 'glinianka' | 'ziemianka';

export type ResourceSearch = 'drzewo' | 'woda' | 'na-miejscu';

export type BuildingKind = 'produkcja' | 'dom';

export interface BuildingDef {
  id: BuildingType;
  name: string;
  kind: BuildingKind;
  cost: Partial<Record<ResourceType, number>>;
  /** Ticks a builder hammers once all materials are on site. */
  buildTicks: number;

  // --- kind: 'produkcja' only ---
  produces?: ResourceType;
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

  // --- kind: 'dom' only ---
  /** Residents this house adds to the shared worker pool once filled. */
  capacity?: number;
  /** Fish a tragarz keeps topping the house up to. */
  rybyTarget?: number;
}

/**
 * First-tier buildings. Costs and timings are starting placeholders for
 * balancing after playtests (see GDD "Otwarte pytania").
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
  ziemianka: {
    id: 'ziemianka',
    name: 'ZIEMIANKA',
    kind: 'dom',
    cost: { drewno: 4 },
    buildTicks: 40,
    capacity: 3,
    rybyTarget: 5,
  },
};

export const BUILDING_ORDER: BuildingType[] = ['drwal', 'rybak', 'glinianka', 'ziemianka'];

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
