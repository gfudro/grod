import { BUILDINGS, type BuildingType } from '../data/buildings';
import { MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { ResourceAmounts, ResourceType } from '../data/resources';
import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { SEASONS, SEASON_TICKS, type Season } from '../data/seasons';
import { footprintContains, footprintTiles, footprintTouchesRoad } from './footprint';
import {
  completeUpgrade,
  houseCapacity,
  houseGoodTarget,
  houseTier,
  houseWantedGoods,
  startReadyUpgrades,
} from './houses';
import { findPath, isAdjacentToRoad } from './pathfinding';
import { findResourceTile, LAND_KEYS, manhattan } from './resource-tiles';
import { consumeHouseGoods, currentSeason, houseShortages, startSeason } from './seasons';
import { addChronicleFirst, closeSeasonLog } from './chronicle';
import {
  addToWarehouse,
  houseGood,
  nextEntityId,
  takeFromWarehouse,
  warehouseAmount,
  type BuildStage,
  type Building,
  type ConstructionSite,
  type FieldPlot,
  type GameState,
  type House,
  type VillagerJob,
  type VillagerState,
} from './state';

/** Ticks to cross one tile: 1 tile per simulated second at the base 10 ticks/second rate. */
export const TICKS_PER_TILE = 10;

/** Ticks to cross one tile right now — slower in winter, through the snow. */
export function ticksPerTile(state: GameState): number {
  return Math.round(TICKS_PER_TILE * SEASONS[currentSeason(state)].walkMultiplier);
}

/** How often (in ticks) the village checks whether a settler should walk in. */
export const SETTLER_CHECK_INTERVAL = 50;

export function tick(state: GameState): void {
  state.tick += 1;
  if (state.tick % SEASON_TICKS === 0) {
    closeSeasonLog(state);
    startSeason(state, currentSeason(state));
  }
  consumeHouseGoods(state);
  noteShortages(state);
  startReadyUpgrades(state);
  for (const villager of state.villagers) {
    advanceVillager(state, villager);
  }
  if (state.tick % SETTLER_CHECK_INTERVAL === 0) {
    maybeSpawnSettler(state);
  }
}

function advanceVillager(state: GameState, villager: VillagerState): void {
  if (villager.motion !== 'walking') {
    villager.waitingFor = null; // runJob sets it again if still held up
    runJob(state, villager);
  }
  if (villager.motion !== 'walking') return;

  villager.segmentTicks += 1;
  if (villager.segmentTicks < ticksPerTile(state)) return;

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
    case 'upgrade':
      runUpgrade(state, villager);
      return;
    case 'produce':
      runProduce(state, villager);
      return;
    case 'farm':
      runFarm(state, villager);
      return;
    case 'process':
      runProcess(state, villager);
      return;
    case 'deliver':
      runDeliver(state, villager);
      return;
    case 'arriving':
      runArriving(state, villager);
      return;
  }
}

function runIdle(state: GameState, villager: VillagerState): void {
  // Still holding something from a job that ended (its building was
  // demolished): carry it home before taking new work.
  if (villager.carrying) {
    carryToWarehouse(state, villager, () => {});
    return;
  }
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

  const upgrading = state.houses.find((h) => h.upgrade && h.upgrade.assignedWorkerId === null);
  if (upgrading) {
    upgrading.upgrade!.assignedWorkerId = villager.id;
    villager.job = { kind: 'upgrade', houseId: upgrading.id, stage: 'toWarehouse' };
    return true;
  }

  const season = currentSeason(state);
  const building = state.buildings.find(
    (b) =>
      BUILDINGS[b.type].kind !== 'usluga' &&
      b.workerId === null &&
      !b.paused &&
      footprintTouchesRoad(b.type, b.tile, state.roads) &&
      // A field only takes a farmer while there is something to sow or reap.
      (!b.plots || pickPlot(b.plots, season) !== null),
  );
  if (building) {
    building.workerId = villager.id;
    villager.job = jobForBuilding(building);
    return true;
  }

  for (const house of state.houses) {
    if (!isAdjacentToRoad(house.tile, state.roads)) continue;
    for (const resource of houseWantedGoods(house, season)) {
      if (warehouseAmount(state, resource) === 0) continue;
      // Count goods already claimed by other tragarze so we never assign
      // more deliveries than the house actually needs (the surplus would
      // just be wasted once the counter hits its target).
      const committed = committedDeliveries(state, house, resource, villager);
      if (houseGood(house, resource) + committed < houseGoodTarget(house, resource, season)) {
        villager.job = { kind: 'deliver', houseId: house.id, resource, stage: 'toWarehouse' };
        return true;
      }
    }
  }

  return false;
}

function jobForBuilding(building: Building): VillagerJob {
  switch (BUILDINGS[building.type].kind) {
    case 'pole':
      return { kind: 'farm', buildingId: building.id, stage: 'toField', plot: 0 };
    case 'przetworstwo':
      return { kind: 'process', buildingId: building.id, stage: 'toBuilding' };
    default:
      return { kind: 'produce', buildingId: building.id, stage: 'toResource' };
  }
}

function committedDeliveries(state: GameState, house: House, resource: ResourceType, except: VillagerState): number {
  return state.villagers.filter(
    (v) => v !== except && v.job.kind === 'deliver' && v.job.houseId === house.id && v.job.resource === resource,
  ).length;
}

/** What a builder needs to know about the thing they are building. */
interface BuildTarget {
  tile: Vec2;
  /** Extra tiles a builder may step on to reach `tile` (the site's own footprint). */
  walkable: string[];
  cost: ResourceAmounts;
  buildTicks: number;
  delivered: ResourceAmounts;
  complete(): void;
}

function runBuild(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'build' }>;
  const site = state.sites.find((s) => s.id === job.siteId);
  if (!site) {
    villager.job = { kind: 'idle' };
    return;
  }
  const def = BUILDINGS[site.type];
  runConstruction(state, villager, job, {
    tile: site.tile,
    walkable: footprintTiles(site.type, site.tile).map(tileKey),
    cost: def.cost,
    buildTicks: def.buildTicks,
    delivered: site.delivered,
    complete: () => completeConstruction(state, site),
  });
}

function runUpgrade(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'upgrade' }>;
  const house = state.houses.find((h) => h.id === job.houseId);
  const upgradeDef = house ? houseTier(house).upgrade : undefined;
  if (!house || !house.upgrade || !upgradeDef) {
    villager.job = { kind: 'idle' };
    return;
  }
  runConstruction(state, villager, job, {
    tile: house.tile,
    walkable: [],
    cost: upgradeDef.cost,
    buildTicks: upgradeDef.buildTicks,
    delivered: house.upgrade.delivered,
    complete: () => completeUpgrade(state, house),
  });
}

/** Shared by new sites and house upgrades: carry paid-for materials over, then hammer. */
function runConstruction(
  state: GameState,
  villager: VillagerState,
  job: { stage: BuildStage },
  target: BuildTarget,
): void {
  if (job.stage === 'toWarehouse') {
    if (!atTile(villager.from, WAREHOUSE_TILE)) {
      beginWalk(state, villager, WAREHOUSE_TILE);
      return;
    }
    // The materials were already paid for out of the warehouse when the
    // site/upgrade started (see sim/placement.ts, sim/houses.ts) — this
    // leg just carries them over, it does not deduct stock again.
    const needed = nextNeededResource(target.cost, target.delivered);
    if (!needed) {
      job.stage = 'toSite';
      villager.motion = 'idle';
      return;
    }
    villager.carrying = needed;
    job.stage = 'toSite';
    beginWalk(state, villager, target.tile, target.walkable);
    return;
  }

  if (job.stage === 'toSite') {
    if (!atTile(villager.from, target.tile)) {
      beginWalk(state, villager, target.tile, target.walkable);
      return;
    }
    if (villager.carrying) {
      target.delivered[villager.carrying] = (target.delivered[villager.carrying] ?? 0) + 1;
      villager.carrying = null;
    }
    if (isFullyDelivered(target.cost, target.delivered)) {
      job.stage = 'hammering';
      villager.workTicksRemaining = target.buildTicks;
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
    target.complete();
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
      // e.g. a rybak fishes slower through the winter ice
      const slowdown = SEASONS[currentSeason(state)].gatherMultiplier[building.type] ?? 1;
      villager.workTicksRemaining = def.gatherTicks! * slowdown;
      villager.motion = 'idle';
      return;
    }
    if (atTile(villager.from, building.tile) || isOffRoad(state, villager)) {
      // From the building on, across open ground to the tree or the water.
      beginWalk(state, villager, building.resourceTile, LAND_KEYS);
      return;
    }
    if (!isAdjacentToRoad(building.tile, state.roads)) {
      villager.motion = 'waiting'; // building lost its road connection
      return;
    }
    beginWalk(state, villager, building.tile); // along the roads to the building first
    return;
  }

  if (job.stage === 'gathering') {
    villager.motion = 'idle';
    villager.workTicksRemaining -= 1;
    if (villager.workTicksRemaining <= 0) {
      villager.carrying = def.produces!;
      job.stage = 'toWarehouse';
    }
    return;
  }

  // job.stage === 'toWarehouse': back over open ground to the building,
  // then along the roads like everyone else.
  if (isOffRoad(state, villager) && !atTile(villager.from, building.tile)) {
    beginWalk(state, villager, building.tile, LAND_KEYS);
    return;
  }
  carryToWarehouse(state, villager, () => {
    job.stage = 'toResource';
  });
}

/** Standing on open ground rather than on a road (e.g. at a tree, on the bank). */
function isOffRoad(state: GameState, villager: VillagerState): boolean {
  return !state.roads.has(tileKey(villager.from)) && !atTile(villager.from, WAREHOUSE_TILE);
}

/**
 * Farmer: harvest any ripe plot, otherwise (in spring) sow any bare one.
 * With nothing to do the farmer goes back to the pool of free workers —
 * the field only needs hands at sowing and at harvest.
 */
function runFarm(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'farm' }>;
  const building = state.buildings.find((b) => b.id === job.buildingId);
  if (!building || !building.plots) {
    villager.job = { kind: 'idle' };
    return;
  }
  const def = BUILDINGS[building.type];
  const tiles = footprintTiles(building.type, building.tile);
  const fieldKeys = tiles.map(tileKey);

  if (job.stage === 'toField') {
    if (!footprintTouchesRoad(building.type, building.tile, state.roads)) {
      villager.motion = 'waiting'; // field lost its road connection
      return;
    }
    const plot = pickPlot(building.plots, currentSeason(state));
    if (plot === null) {
      building.workerId = null;
      villager.job = { kind: 'idle' };
      villager.motion = 'idle';
      return;
    }
    const target = tiles[plot];
    if (!atTile(villager.from, target)) {
      beginWalk(state, villager, target, fieldKeys);
      return;
    }
    villager.motion = 'idle';
    job.plot = plot;
    if (building.plots[plot].stage === 'dojrzale') {
      job.stage = 'harvesting';
      villager.workTicksRemaining = def.harvestTicks!;
    } else {
      job.stage = 'sowing';
      villager.workTicksRemaining = def.sowTicks!;
    }
    return;
  }

  if (job.stage === 'sowing' || job.stage === 'harvesting') {
    villager.motion = 'idle';
    villager.workTicksRemaining -= 1;
    if (villager.workTicksRemaining > 0) return;
    const plot = building.plots[job.plot];
    if (job.stage === 'sowing') {
      plot.stage = 'kielki';
      job.stage = 'toField';
    } else {
      plot.yieldLeft -= 1;
      addChronicleFirst(state, 'pierwsze-zniwa');
      if (plot.yieldLeft <= 0) plot.stage = 'sciete';
      villager.carrying = def.produces!;
      job.stage = 'toWarehouse';
    }
    return;
  }

  // job.stage === 'toWarehouse'
  carryToWarehouse(state, villager, () => {
    job.stage = 'toField';
  });
}

function pickPlot(plots: FieldPlot[], season: Season): number | null {
  const ripe = plots.findIndex((p) => p.stage === 'dojrzale');
  if (ripe >= 0) return ripe;
  if (!SEASONS[season].sowing) return null;
  const bare = plots.findIndex((p) => p.stage === 'zaorane' || p.stage === 'sciete');
  return bare >= 0 ? bare : null;
}

/**
 * Processor (żarna): walks to the warehouse for one input, works it at
 * the building, carries the output back. With no input in stock they
 * stand in front of the building showing what is missing.
 */
function runProcess(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'process' }>;
  const building = state.buildings.find((b) => b.id === job.buildingId);
  if (!building) {
    villager.job = { kind: 'idle' };
    return;
  }
  const def = BUILDINGS[building.type];
  const input = def.consumes!;

  if (job.stage === 'toBuilding') {
    if (!footprintTouchesRoad(building.type, building.tile, state.roads)) {
      villager.motion = 'waiting'; // building lost its road connection
      return;
    }
    if (!atTile(villager.from, building.tile)) {
      beginWalk(state, villager, building.tile);
      return;
    }
    if (villager.carrying === input) {
      job.stage = 'working';
      villager.workTicksRemaining = def.processTicks!;
      villager.motion = 'idle';
      return;
    }
    if (warehouseAmount(state, input) > 0) {
      job.stage = 'toWarehouse';
      beginWalk(state, villager, WAREHOUSE_TILE);
      return;
    }
    villager.motion = 'waiting';
    villager.waitingFor = input;
    return;
  }

  if (job.stage === 'working') {
    villager.motion = 'idle';
    villager.workTicksRemaining -= 1;
    if (villager.workTicksRemaining <= 0) {
      villager.carrying = def.produces!;
      job.stage = 'toWarehouse';
    }
    return;
  }

  // job.stage === 'toWarehouse': drop off any output, pick up the next input.
  if (!atTile(villager.from, WAREHOUSE_TILE)) {
    beginWalk(state, villager, WAREHOUSE_TILE);
    return;
  }
  if (villager.carrying) {
    addToWarehouse(state, villager.carrying, 1);
    villager.carrying = null;
  }
  if (takeFromWarehouse(state, input, 1)) villager.carrying = input;
  job.stage = 'toBuilding';
  villager.motion = 'idle';
}

function carryToWarehouse(state: GameState, villager: VillagerState, onDropped: () => void): void {
  if (atTile(villager.from, WAREHOUSE_TILE)) {
    if (villager.carrying) {
      addToWarehouse(state, villager.carrying, 1);
      villager.carrying = null;
    }
    onDropped();
    villager.motion = 'idle';
    return;
  }
  beginWalk(state, villager, WAREHOUSE_TILE);
}

function runDeliver(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'deliver' }>;
  const house = state.houses.find((h) => h.id === job.houseId);
  if (!house) {
    villager.job = { kind: 'idle' };
    return;
  }
  const target = houseGoodTarget(house, job.resource, currentSeason(state));

  if (job.stage === 'toWarehouse') {
    if (!atTile(villager.from, WAREHOUSE_TILE)) {
      beginWalk(state, villager, WAREHOUSE_TILE);
      return;
    }
    // Other tragarze already carrying this good toward this house also
    // count — otherwise several workers could each grab "the last unit"
    // at once and overshoot the target, wasting the surplus.
    const othersCommitted = committedDeliveries(state, house, job.resource, villager);
    if (houseGood(house, job.resource) + othersCommitted >= target || !takeFromWarehouse(state, job.resource, 1)) {
      // need already met (or about to be, by someone else), or the
      // warehouse is out of this good — free the worker either way.
      villager.job = { kind: 'idle' };
      villager.motion = 'idle';
      return;
    }
    villager.carrying = job.resource;
    job.stage = 'toHouse';
    beginWalk(state, villager, house.tile);
    return;
  }

  // job.stage === 'toHouse'
  if (!atTile(villager.from, house.tile)) {
    if (!isAdjacentToRoad(house.tile, state.roads)) {
      villager.motion = 'waiting'; // house lost its road connection
      return;
    }
    beginWalk(state, villager, house.tile);
    return;
  }
  // No cap here: if the season turned while walking (firewood no longer
  // wanted in spring), the unit is still put down rather than vanishing.
  house.goods[job.resource] = houseGood(house, job.resource) + 1;
  villager.carrying = null;
  villager.motion = 'idle';
  if (houseGood(house, job.resource) >= target) {
    villager.job = { kind: 'idle' };
  } else {
    job.stage = 'toWarehouse';
  }
}

function runArriving(state: GameState, villager: VillagerState): void {
  const job = villager.job as Extract<VillagerJob, { kind: 'arriving' }>;
  const house = state.houses.find((h) => h.id === job.houseId);
  if (!house || house.residents >= houseCapacity(house)) {
    // Slot filled by someone else (or the house is gone) — join as idle.
    villager.job = { kind: 'idle' };
    villager.motion = 'idle';
    return;
  }
  if (atTile(villager.from, house.tile)) {
    house.residents += 1;
    state.seasonLog.settlers += 1;
    villager.job = { kind: 'idle' };
    villager.motion = 'idle';
    return;
  }
  beginWalk(state, villager, house.tile);
}

function completeConstruction(state: GameState, site: ConstructionSite): void {
  const def = BUILDINGS[site.type];
  if (def.kind === 'dom') {
    addChronicleFirst(state, 'pierwsza-ziemianka');
    state.houses.push({
      id: nextEntityId(state, 'dom'),
      tile: site.tile,
      tier: 0,
      residents: 0,
      goods: {},
      upgrade: null,
    });
  } else {
    state.buildings.push(createBuilding(state, site.type, site.tile));
  }
  state.sites = state.sites.filter((s) => s.id !== site.id);
}

function createBuilding(state: GameState, type: BuildingType, tile: Vec2): Building {
  const def = BUILDINGS[type];
  const building: Building = {
    id: nextEntityId(state, 'budynek'),
    type,
    tile,
    resourceTile: def.resourceSearch ? findResourceTile(tile, def.resourceSearch) : null,
    workerId: null,
    paused: false,
  };
  if (def.kind === 'pole') {
    building.plots = footprintTiles(type, tile).map(() => ({ stage: 'zaorane', yieldLeft: 0 }));
  }
  return building;
}

/** Remembers hunger and cold this season, for the chronicle. */
function noteShortages(state: GameState): void {
  for (const house of state.houses) {
    for (const missing of houseShortages(state, house)) {
      if (missing === 'ryba') state.seasonLog.hungry = true;
      if (missing === 'drewno') state.seasonLog.cold = true;
    }
  }
}

/** True when an occupied house has no fish, or no firewood in winter — blocks new settlers. */
function hasHungerOrCold(state: GameState): boolean {
  return state.houses.some((h) => houseShortages(state, h).length > 0);
}

function findReachableEdgeTile(state: GameState, target: Vec2): Vec2 | null {
  const candidates: Vec2[] = [];
  for (let x = 0; x < MAP_WIDTH; x++) {
    if (TERRAIN[0][x] === 'trawa') candidates.push({ x, y: 0 });
    if (TERRAIN[MAP_HEIGHT - 1][x] === 'trawa') candidates.push({ x, y: MAP_HEIGHT - 1 });
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    if (TERRAIN[y][0] === 'trawa') candidates.push({ x: 0, y });
    if (TERRAIN[y][MAP_WIDTH - 1] === 'trawa') candidates.push({ x: MAP_WIDTH - 1, y });
  }
  candidates.sort((a, b) => manhattan(a, target) - manhattan(b, target));

  for (const candidate of candidates) {
    if (findPath(state.roads, candidate, target)) return candidate;
  }
  return null;
}

function maybeSpawnSettler(state: GameState): void {
  if (hasHungerOrCold(state)) return;

  // The first house with room that a road links to the map edge. A house
  // with no such road is skipped rather than holding up all the others.
  let house: House | null = null;
  let spawnTile: Vec2 | null = null;
  for (const h of state.houses) {
    const enRoute = state.villagers.filter((v) => v.job.kind === 'arriving' && v.job.houseId === h.id).length;
    if (h.residents + enRoute >= houseCapacity(h)) continue;
    spawnTile = findReachableEdgeTile(state, h.tile);
    if (spawnTile) {
      house = h;
      break;
    }
  }
  if (!house || !spawnTile) return; // no vacant house is reachable from the map edge yet

  state.villagers.push({
    id: nextEntityId(state, 'osadnik'),
    from: spawnTile,
    to: { ...spawnTile },
    segmentTicks: 0,
    path: [],
    motion: 'idle',
    facing: 1,
    job: { kind: 'arriving', houseId: house.id },
    carrying: null,
    workTicksRemaining: 0,
    waitingFor: null,
  });
}

function nextNeededResource(cost: ResourceAmounts, delivered: ResourceAmounts): ResourceType | null {
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    if ((delivered[resource] ?? 0) < amount) return resource;
  }
  return null;
}

function isFullyDelivered(cost: ResourceAmounts, delivered: ResourceAmounts): boolean {
  return (Object.entries(cost) as [ResourceType, number][]).every(
    ([resource, amount]) => (delivered[resource] ?? 0) >= amount,
  );
}

function atTile(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

/**
 * Walk along roads to `target`. `extraWalkable` lets a villager also step
 * on non-road tiles: open land on a drwal's way to his tree, or the plots of a
 * field or the footprint of a 2×2 site.
 */
function beginWalk(
  state: GameState,
  villager: VillagerState,
  target: Vec2,
  extraWalkable: Iterable<string> = [],
): void {
  if (atTile(villager.from, target)) {
    villager.motion = 'idle';
    return;
  }
  // A villager standing inside a multi-tile footprint (a field plot, a
  // 2×2 site) may need to cross its other tiles to get back to a road.
  const leaving = footprintKeysAt(state, villager.from);
  const extra = [...extraWalkable, ...leaving];
  const walkable = extra.length > 0 ? new Set([...state.roads, ...extra]) : state.roads;
  const path = findPath(walkable, villager.from, target);
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

function footprintKeysAt(state: GameState, tile: Vec2): string[] {
  const owner =
    state.buildings.find((b) => footprintContains(b.type, b.tile, tile)) ??
    state.sites.find((s) => footprintContains(s.type, s.tile, tile));
  if (!owner || (BUILDINGS[owner.type].footprint ?? null) === null) return [];
  return footprintTiles(owner.type, owner.tile).map(tileKey);
}

function updateFacing(villager: VillagerState): void {
  if (villager.to.x > villager.from.x) villager.facing = 1;
  else if (villager.to.x < villager.from.x) villager.facing = -1;
}
