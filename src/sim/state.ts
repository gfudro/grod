import type { BuildingType } from '../data/buildings';
import { STARTING_WAREHOUSE_STOCK, STARTING_WORKER_POOL } from '../data/buildings';
import type { ResourceAmounts, ResourceType } from '../data/resources';
import type { Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { createRng, type RngState } from './rng';

export type SpeedMultiplier = 0 | 1 | 2 | 3;

export type VillagerMotion = 'idle' | 'walking' | 'waiting';

export type VillagerJob =
  | { kind: 'idle' }
  | { kind: 'build'; siteId: string; stage: 'toWarehouse' | 'toSite' | 'hammering' }
  | { kind: 'produce'; buildingId: string; stage: 'toResource' | 'gathering' | 'toWarehouse' }
  | { kind: 'deliver'; houseId: string; stage: 'toWarehouse' | 'toHouse' }
  | { kind: 'arriving'; houseId: string };

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
  /** Counts down while gathering a resource or hammering a construction site. */
  workTicksRemaining: number;
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
}

export interface House {
  id: string;
  tile: Vec2;
  /** Residents this house has contributed to the shared worker pool so far. */
  residents: number;
  capacity: number;
  ryby: number;
  rybyTarget: number;
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
  };
  for (let i = 0; i < STARTING_WORKER_POOL; i++) {
    state.villagers.push(createIdleVillager(nextEntityId(state, 'ludzik')));
  }
  return state;
}
