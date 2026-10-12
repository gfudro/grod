import { BUILDINGS } from '../data/buildings';
import type { ResourceType } from '../data/resources';
import type { Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { findPath, isAdjacentToRoad } from './pathfinding';
import { findResourceTile } from './resource-tiles';
import {
  addToWarehouse,
  nextEntityId,
  type ConstructionSite,
  type GameState,
  type VillagerJob,
  type VillagerState,
} from './state';

/** Ticks to cross one tile: 1 tile per simulated second at the base 10 ticks/second rate. */
export const TICKS_PER_TILE = 10;

export function tick(state: GameState): void {
  state.tick += 1;
  for (const villager of state.villagers) {
    advanceVillager(state, villager);
  }
}

function advanceVillager(state: GameState, villager: VillagerState): void {
  if (villager.motion !== 'walking') {
    runJob(state, villager);
  }
  if (villager.motion !== 'walking') return;

  villager.segmentTicks += 1;
  if (villager.segmentTicks < TICKS_PER_TILE) return;

  villager.segmentTicks = 0;
  villager.from = villager.to;
  villager.path = villager.path.slice(1);

  if (villager.path.length > 0) {
    villager.to = villager.path[0];
    updateFacing(villager);
    return;
  }

  villager.motion = 'idle';
}

function runJob(state: GameState, villager: VillagerState): void {
  switch (villager.job.kind) {
    case 'idle':
      runIdle(state, villager);
      return;
    case 'build':
      runBuild(state, villager);
      return;
    case 'produce':
      runProduce(state, villager);
      return;
  }
}

function runIdle(state: GameState, villager: VillagerState): void {
  if (tryAssignWork(state, villager)) {
    runJob(state, villager); // act on the fresh assignment this same tick
    return;
  }
  if (atTile(villager.from, WAREHOUSE_TILE)) {
    villager.motion = 'idle';
  } else {
    beginWalk(state, villager, WAREHOUSE_TILE);
  }
}

function tryAssignWork(state: GameState, villager: VillagerState): boolean {
  const site = state.sites.find((s) => s.assignedWorkerId === null);
  if (site) {
    site.assignedWorkerId = villager.id;
    villager.job = { kind: 'build', siteId: site.id, stage: 'toWarehouse' };
    return true;
  }

  const building = state.buildings.find(
    (b) => b.workerId === null && isAdjacentToRoad(b.tile, state.roads),
  );
  if (building) {
    building.workerId = villager.id;
    villager.job = { kind: 'produce', buildingId: building.id, stage: 'toResource' };
    return true;
  }

  return false;
}

function runBuild(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'build' }>;
  const site = state.sites.find((s) => s.id === job.siteId);
  if (!site) {
    villager.job = { kind: 'idle' };
    return;
  }
  const def = BUILDINGS[site.type];

  if (job.stage === 'toWarehouse') {
    if (!atTile(villager.from, WAREHOUSE_TILE)) {
      beginWalk(state, villager, WAREHOUSE_TILE);
      return;
    }
    // The site's materials were already paid for out of the warehouse when
    // it was placed (see sim/placement.ts) — this leg just carries them
    // from warehouse to site, it does not deduct stock again.
    const needed = nextNeededResource(def.cost, site.delivered);
    if (!needed) {
      villager.motion = 'idle';
      return;
    }
    villager.carrying = needed;
    job.stage = 'toSite';
    beginWalk(state, villager, site.tile);
    return;
  }

  if (job.stage === 'toSite') {
    if (!atTile(villager.from, site.tile)) {
      beginWalk(state, villager, site.tile);
      return;
    }
    if (villager.carrying) {
      site.delivered[villager.carrying] = (site.delivered[villager.carrying] ?? 0) + 1;
      villager.carrying = null;
    }
    if (isFullyDelivered(def.cost, site.delivered)) {
      job.stage = 'hammering';
      villager.workTicksRemaining = def.buildTicks;
    } else {
      job.stage = 'toWarehouse';
    }
    villager.motion = 'idle';
    return;
  }

  // job.stage === 'hammering'
  villager.motion = 'idle';
  villager.workTicksRemaining -= 1;
  if (villager.workTicksRemaining <= 0) {
    completeConstruction(state, site);
    villager.job = { kind: 'idle' };
  }
}

function runProduce(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'produce' }>;
  const building = state.buildings.find((b) => b.id === job.buildingId);
  if (!building) {
    villager.job = { kind: 'idle' };
    return;
  }
  const def = BUILDINGS[building.type];

  if (job.stage === 'toResource') {
    if (!building.resourceTile) {
      villager.motion = 'waiting'; // no tree/water found on the map for this building
      return;
    }
    if (atTile(villager.from, building.resourceTile)) {
      job.stage = 'gathering';
      villager.workTicksRemaining = def.gatherTicks;
      villager.motion = 'idle';
      return;
    }
    if (!isAdjacentToRoad(building.tile, state.roads)) {
      villager.motion = 'waiting'; // building lost its road connection
      return;
    }
    beginWalk(state, villager, building.resourceTile);
    return;
  }

  if (job.stage === 'gathering') {
    villager.motion = 'idle';
    villager.workTicksRemaining -= 1;
    if (villager.workTicksRemaining <= 0) {
      villager.carrying = def.produces;
      job.stage = 'toWarehouse';
    }
    return;
  }

  // job.stage === 'toWarehouse'
  if (atTile(villager.from, WAREHOUSE_TILE)) {
    if (villager.carrying) {
      addToWarehouse(state, villager.carrying, 1);
      villager.carrying = null;
    }
    job.stage = 'toResource';
    villager.motion = 'idle';
    return;
  }
  beginWalk(state, villager, WAREHOUSE_TILE);
}

function completeConstruction(state: GameState, site: ConstructionSite): void {
  const def = BUILDINGS[site.type];
  state.buildings.push({
    id: nextEntityId(state, 'budynek'),
    type: site.type,
    tile: site.tile,
    resourceTile: findResourceTile(site.tile, def.resourceSearch),
    workerId: null,
  });
  state.sites = state.sites.filter((s) => s.id !== site.id);
}

function nextNeededResource(
  cost: Partial<Record<ResourceType, number>>,
  delivered: Partial<Record<ResourceType, number>>,
): ResourceType | null {
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    if ((delivered[resource] ?? 0) < amount) return resource;
  }
  return null;
}

function isFullyDelivered(
  cost: Partial<Record<ResourceType, number>>,
  delivered: Partial<Record<ResourceType, number>>,
): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(
    ([resource, amount]) => (delivered[resource] ?? 0) >= amount,
  );
}

function atTile(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

function beginWalk(state: GameState, villager: VillagerState, target: Vec2): void {
  if (atTile(villager.from, target)) {
    villager.motion = 'idle';
    return;
  }
  const path = findPath(state.roads, villager.from, target);
  if (!path || path.length === 0) {
    villager.motion = 'waiting';
    return;
  }
  villager.path = path;
  villager.to = path[0];
  villager.segmentTicks = 0;
  villager.motion = 'walking';
  updateFacing(villager);
}

function updateFacing(villager: VillagerState): void {
  if (villager.to.x > villager.from.x) villager.facing = 1;
  else if (villager.to.x < villager.from.x) villager.facing = -1;
}
