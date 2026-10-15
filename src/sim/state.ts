import type { BuildingType } from '../data/buildings';
import { STARTING_WAREHOUSE_STOCK, STARTING_WORKER_POOL } from '../data/buildings';
import type { ResourceAmounts, ResourceType } from '../data/resources';
import type { Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { createRng, type RngState } from './rng';
import { addChronicleEntry, emptySeasonLog, type ChronicleEntry, type SeasonLog } from './chronicle';

/** Game speeds on the HUD; x5 and above are mainly for playtesting long stretches. */
export const SPEEDS = [1, 2, 3, 5, 10, 20, 60] as const;

/** 0 = paused. */
export type SpeedMultiplier = 0 | (typeof SPEEDS)[number];

export type VillagerMotion = 'idle' | 'walking' | 'waiting';

export type VillagerJob =
  | { kind: 'idle' }
  | { kind: 'build'; siteId: string; stage: BuildStage }
  | { kind: 'upgrade'; houseId: string; stage: BuildStage }
  | { kind: 'produce'; buildingId: string; stage: 'toResource' | 'gathering' | 'toWarehouse' }
  | { kind: 'farm'; buildingId: string; stage: 'toField' | 'sowing' | 'harvesting' | 'toWarehouse'; plot: number }
  | { kind: 'process'; buildingId: string; stage: 'toBuilding' | 'working' | 'toWarehouse' }
  | { kind: 'deliver'; houseId: string; resource: ResourceType; stage: 'toWarehouse' | 'toHouse' }
  | { kind: 'arriving'; houseId: string }
  /** Runs buckets of water from the studnia to a burning house. */
  | { kind: 'douse'; houseId: string; stage: 'toWell' | 'toHouse' }
  /** Rebuilds burned ruins (after ODBUDUJ), like a construction site. */
  | { kind: 'rebuild'; houseId: string; stage: BuildStage };

export type BuildStage = 'toWarehouse' | 'toSite' | 'hammering';

export interface VillagerState {
  id: string;
  from: Vec2;
  to: Vec2;
  segmentTicks: number;
  path: Vec2[];
  motion: VillagerMotion;
  facing: 1 | -1;
  job: VillagerJob;
  carrying: ResourceType | null;
  /** Counts down while gathering, sowing, harvesting, processing or hammering. */
  workTicksRemaining: number;
  /** While waiting: the resource whose absence holds this villager up (null = no road). */
  waitingFor: ResourceType | null;
}

export interface ConstructionSite {
  id: string;
  type: BuildingType;
  tile: Vec2;
  delivered: ResourceAmounts;
  assignedWorkerId: string | null;
}

export interface Building {
  id: string;
  type: BuildingType;
  tile: Vec2;
  /** Where the worker must go to gather the resource; null if none exists on the map. */
  resourceTile: Vec2 | null;
  workerId: string | null;
  /** Paused buildings never get a worker, and release theirs immediately. */
  paused: boolean;
  /** Field plots, one per footprint tile in footprintTiles() order (pole only). */
  plots?: FieldPlot[];
}

/**
 * The field follows the calendar (GDD "Pory roku"):
 * zaorane/sciete: bare, sown in spring; kielki: sprouts (spring);
 * lodygi: green stalks (summer); dojrzale: ripe, harvested from autumn on.
 */
export type PlotStage = 'zaorane' | 'kielki' | 'lodygi' | 'dojrzale' | 'sciete';

export interface FieldPlot {
  stage: PlotStage;
  /** Units still to harvest from a 'dojrzale' plot. */
  yieldLeft: number;
}

/** A house rebuilding into its next tier — works like a construction site. */
export interface HouseUpgrade {
  delivered: ResourceAmounts;
  assignedWorkerId: string | null;
}

export interface House {
  id: string;
  tile: Vec2;
  /** Index into HOUSE_TIERS: 0 = ziemianka, 1 = chata, 2 = zagroda, 3 = dwór. Never goes down. */
  tier: number;
  /** Residents this house has contributed to the shared worker pool so far. */
  residents: number;
  /** Goods delivered so far; targets come from HOUSE_TIERS[tier].goods. */
  goods: ResourceAmounts;
  upgrade: HouseUpgrade | null;
  /** Burning after a lightning strike; null (or absent in older saves) = not on fire. */
  fire?: HouseFire | null;
  /**
   * Burned down: zgliszcza on the map until ODBUDUJ. The house keeps its
   * tier, its residents (they stay in the gród as workers) and its goods.
   */
  ruined?: boolean;
  /** Ruins being rebuilt after ODBUDUJ — paid for, works like a construction site. */
  rebuild?: HouseUpgrade | null;
}

export interface HouseFire {
  /** Ticks until the house falls to ruins, unless the buckets win first. */
  ticksLeft: number;
  /** Buckets poured so far (STORM.bucketsToDouse puts it out). */
  water: number;
}

/**
 * A summer storm. Planned at the start of summer; at `appearTick` the
 * cloud picks a house and hangs over it until `strikeTick`.
 */
export interface Storm {
  appearTick: number;
  strikeTick: number;
  /** The house under the cloud; null until the cloud appears. */
  houseId: string | null;
}

/** The last bolt, kept for a moment so it can be drawn. */
export interface LightningStrike {
  tick: number;
  /** Where it came down: the burning house, or the kontyna that took it. */
  tile: Vec2;
}
export interface GameState {
  tick: number;
  rng: RngState;
  speed: SpeedMultiplier;
  roads: Set<string>;
  warehouse: ResourceAmounts;
  villagers: VillagerState[];
  sites: ConstructionSite[];
  buildings: Building[];
  houses: House[];
  nextEntityId: number;
  /** The gród's name, given by Artur; empty until named. */
  name: string;
  /** Important moments, oldest first. Saved apart from the rest (see save/). */
  chronicle: ChronicleEntry[];
  seasonLog: SeasonLog;
  /** This summer's storms still to come or hanging over a house, soonest first. */
  storms: Storm[];
  lastStrike: LightningStrike | null;
}

export function warehouseAmount(state: GameState, resource: ResourceType): number {
  return state.warehouse[resource] ?? 0;
}

export function addToWarehouse(state: GameState, resource: ResourceType, amount: number): void {
  state.warehouse[resource] = warehouseAmount(state, resource) + amount;
}

export function takeFromWarehouse(state: GameState, resource: ResourceType, amount: number): boolean {
  const current = warehouseAmount(state, resource);
  if (current < amount) return false;
  state.warehouse[resource] = current - amount;
  return true;
}

/**
 * Everyone living in the gród: the starting crew plus every settler who
 * has reached their house. Settlers still walking in with their bundles
 * don't count yet — they join the moment they arrive.
 */
export function villagePopulation(state: GameState): number {
  return state.villagers.filter((v) => v.job.kind !== 'arriving').length;
}

export function houseGood(house: House, resource: ResourceType): number {
  return house.goods[resource] ?? 0;
}

export function nextEntityId(state: GameState, prefix: string): string {
  const id = `${prefix}-${state.nextEntityId}`;
  state.nextEntityId += 1;
  return id;
}

function createIdleVillager(id: string): VillagerState {
  const start = { ...WAREHOUSE_TILE };
  return {
    id,
    from: start,
    to: { ...start },
    segmentTicks: 0,
    path: [],
    motion: 'idle',
    facing: 1,
    job: { kind: 'idle' },
    carrying: null,
    workTicksRemaining: 0,
    waitingFor: null,
  };
}

export function createInitialState(seed = 1): GameState {
  const state: GameState = {
    tick: 0,
    rng: createRng(seed),
    speed: 1,
    roads: new Set(),
    warehouse: { ...STARTING_WAREHOUSE_STOCK },
    villagers: [],
    sites: [],
    buildings: [],
    houses: [],
    nextEntityId: 1,
    name: '',
    chronicle: [],
    seasonLog: emptySeasonLog(),
    storms: [],
    lastStrike: null,
  };
  addChronicleEntry(state, 'zalozenie');
  for (let i = 0; i < STARTING_WORKER_POOL; i++) {
    state.villagers.push(createIdleVillager(nextEntityId(state, 'ludzik')));
  }
  return state;
}
