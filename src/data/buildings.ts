import type { ResourceType } from './resources';

export type BuildingType = 'drwal' | 'rybak' | 'glinianka';

export type ResourceSearch = 'drzewo' | 'woda' | 'na-miejscu';

export interface BuildingDef {
  id: BuildingType;
  name: string;
  cost: Partial<Record<ResourceType, number>>;
  /** Ticks a builder hammers once all materials are on site. */
  buildTicks: number;
  produces: ResourceType;
  /** Ticks to gather one unit at the resource tile. */
  gatherTicks: number;
  resourceSearch: ResourceSearch;
  /**
   * Max tiles (Manhattan, as the crow flies) from the building to its
   * resource. Placement is refused beyond this range, so a drwal can't
   * be dropped on the far side of the map from any tree. Buildings that
   * gather 'na-miejscu' have no range — the resource is the site itself.
   */
  maxResourceRange?: number;
}

/**
 * First-tier production buildings. Costs and timings are starting
 * placeholders for balancing after playtests (see GDD "Otwarte pytania").
 */
export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  drwal: {
    id: 'drwal',
    name: 'DRWAL',
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
    cost: { drewno: 2 },
    buildTicks: 20,
    produces: 'glina',
    gatherTicks: 20,
    resourceSearch: 'na-miejscu',
  },
};

export const BUILDING_ORDER: BuildingType[] = ['drwal', 'rybak', 'glinianka'];

/** Starting warehouse stock, enough for one or two starter buildings. */
export const STARTING_WAREHOUSE_STOCK: Partial<Record<ResourceType, number>> = {
  drewno: 6,
};

/** Free workers available before houses (M3) exist to grow the pool. */
export const STARTING_WORKER_POOL = 3;
