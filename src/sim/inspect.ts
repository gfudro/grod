import { BUILDINGS, type BuildingKind } from '../data/buildings';
import { HOUSE_TIERS } from '../data/houses';
import type { ResourceType } from '../data/resources';
import type { Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { footprintContains, footprintTouchesRoad } from './footprint';
import {
  findServingBuilding,
  houseCapacity,
  houseGoodTarget,
  houseTier,
  houseWantedGoods,
  serviceRangeTiles,
  upgradeReadiness,
  type UpgradeReadiness,
} from './houses';
import { isAdjacentToRoad } from './pathfinding';
import { currentSeason, houseShortages } from './seasons';
import { protectingKontyna, rebuildCostMissing, servingWell, stormDaysLeft } from './storms';
import { houseGood, type GameState, type PlotStage, type VillagerState } from './state';
import { MOUND } from '../data/mound';
import { moundBuilders, moundMissing, moundTiles } from './mound';

export interface GoodCounter {
  resource: ResourceType;
  have: number;
  target: number;
}

export type InspectInfo =
  | { kind: 'warehouse'; connected: boolean; stock: Partial<Record<string, number>> }
  | { kind: 'site'; id: string; name: string; delivered: string; assignedWorkerId: string | null }
  | {
      kind: 'building';
      id: string;
      name: string;
      buildingKind: BuildingKind;
      connected: boolean;
      hasWorker: boolean;
      workerWaiting: boolean;
      /** What the worker is waiting for, if they are held up by a missing good. */
      workerWaitingFor: ResourceType | null;
      resourceTile: Vec2 | null;
      paused: boolean;
      /** Tiles to shade on the map — the range of a service building. */
      rangeTiles: Vec2[] | null;
      plots: PlotStage[] | null;
    }
  | {
      kind: 'house';
      id: string;
      name: string;
      connected: boolean;
      residents: number;
      capacity: number;
      goods: GoodCounter[];
      /** Name of the next tier, or null on the top tier. */
      nextName: string | null;
      readiness: UpgradeReadiness;
      upgrading: boolean;
      /** Hunger (ryba) or cold (drewno) right now. */
      shortages: ResourceType[];
      /** Range of the service building serving this house, so the player sees it covers the house. */
      rangeTiles: Vec2[] | null;
      burning: boolean;
      /** Burned down: zgliszcza waiting for ODBUDUJ. */
      ruined: boolean;
      rebuilding: boolean;
      /** Materials the warehouse lacks for ODBUDUJ. */
      rebuildMissing: ResourceType[];
      /** A kontyna Peruna would take a bolt aimed at this house. */
      shielded: boolean;
      /** A studnia's buckets reach this house. */
      hasWell: boolean;
      /** Days until the bolt, while a storm cloud hangs over this house. */
      stormDays: number | null;
    }
  | {
      kind: 'mound';
      name: string;
      done: boolean;
      connected: boolean;
      goods: GoodCounter[];
      builders: number;
      /** Materials still needed that the warehouse has none of. */
      missing: ResourceType[];
    }
  | { kind: 'villager'; description: string; targetTile: Vec2 | null };

function atTile(tile: Vec2, target: Vec2): boolean {
  return tile.x === target.x && tile.y === target.y;
}

const JOB_DESCRIPTIONS: Record<string, string> = {
  idle: 'wolny',
  build: 'buduje',
  upgrade: 'buduje',
  produce: 'pracuje',
  farm: 'rolnik',
  process: 'przerabia',
  deliver: 'nosi',
  arriving: 'osadnik w drodze',
  douse: 'gasi ogień',
  rebuild: 'odbudowuje',
  mound: 'sypie kopiec',
};

function describeVillager(villager: VillagerState): string {
  if (villager.motion === 'waiting') {
    return villager.waitingFor ? `czeka: ${villager.waitingFor}` : 'czeka na drogę';
  }
  return JOB_DESCRIPTIONS[villager.job.kind] ?? villager.job.kind;
}

/** Where a villager is currently trying to reach, for showing on the map. */
function villagerTargetTile(state: GameState, villager: VillagerState): Vec2 | null {
  const job = villager.job;
  switch (job.kind) {
    case 'build': {
      const site = state.sites.find((s) => s.id === job.siteId);
      if (!site) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : site.tile;
    }
    case 'upgrade': {
      const house = state.houses.find((h) => h.id === job.houseId);
      if (!house) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : house.tile;
    }
    case 'produce': {
      const building = state.buildings.find((b) => b.id === job.buildingId);
      if (!building) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : building.resourceTile;
    }
    case 'farm':
    case 'process': {
      const building = state.buildings.find((b) => b.id === job.buildingId);
      if (!building) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : building.tile;
    }
    case 'deliver': {
      const house = state.houses.find((h) => h.id === job.houseId);
      if (!house) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : house.tile;
    }
    case 'arriving': {
      const house = state.houses.find((h) => h.id === job.houseId);
      return house ? house.tile : null;
    }
    case 'douse': {
      const house = state.houses.find((h) => h.id === job.houseId);
      if (!house) return null;
      return job.stage === 'toWell' ? (servingWell(state, house)?.tile ?? null) : house.tile;
    }
    case 'rebuild': {
      const house = state.houses.find((h) => h.id === job.houseId);
      if (!house) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : house.tile;
    }
    case 'mound':
      if (!state.mound) return null;
      return job.stage === 'toWarehouse' ? WAREHOUSE_TILE : state.mound.tile;
    case 'idle':
      return WAREHOUSE_TILE;
  }
}

/**
 * What a tap on this tile shows. Buildings, houses, sites and the warehouse
 * come first: a worker waiting inside a building must never cover it up,
 * or the player could not tap the building to pause it and free them (its
 * panel says what the worker waits for anyway). A villager is shown when
 * tapped on a road or open ground.
 */
export function inspectTile(state: GameState, tile: Vec2): InspectInfo | null {
  return inspectStructure(state, tile) ?? inspectVillager(state, tile);
}

function inspectVillager(state: GameState, tile: Vec2): InspectInfo | null {
  const villager = state.villagers.find((v) => atTile(v.from, tile) && v.motion !== 'walking');
  if (!villager) return null;
  return {
    kind: 'villager',
    description: describeVillager(villager),
    targetTile: villagerTargetTile(state, villager),
  };
}

function inspectStructure(state: GameState, tile: Vec2): InspectInfo | null {
  if (atTile(tile, WAREHOUSE_TILE)) {
    return { kind: 'warehouse', connected: isAdjacentToRoad(tile, state.roads), stock: { ...state.warehouse } };
  }

  const building = state.buildings.find((b) => footprintContains(b.type, b.tile, tile));
  if (building) {
    const def = BUILDINGS[building.type];
    const worker = state.villagers.find((v) => v.id === building.workerId);
    return {
      kind: 'building',
      id: building.id,
      name: def.name,
      buildingKind: def.kind,
      connected: footprintTouchesRoad(building.type, building.tile, state.roads),
      hasWorker: building.workerId !== null,
      workerWaiting: worker?.motion === 'waiting',
      workerWaitingFor: worker?.motion === 'waiting' ? worker.waitingFor : null,
      resourceTile: building.resourceTile,
      paused: building.paused,
      rangeTiles: def.serviceRange !== undefined ? serviceRangeTiles(building.tile, def.serviceRange) : null,
      plots: building.plots ? building.plots.map((p) => p.stage) : null,
    };
  }

  const house = state.houses.find((h) => atTile(h.tile, tile));
  if (house) {
    const upgrade = houseTier(house).upgrade;
    const serving = upgrade ? findServingBuilding(state, upgrade.service, house.tile) : null;
    const servingRange = serving ? BUILDINGS[serving.type].serviceRange ?? 0 : 0;
    const storm = state.storms.find((s) => s.houseId === house.id);
    return {
      kind: 'house',
      id: house.id,
      name: houseTier(house).name,
      connected: isAdjacentToRoad(house.tile, state.roads),
      residents: house.residents,
      capacity: houseCapacity(house),
      goods: houseWantedGoods(house, currentSeason(state)).map((resource) => ({
        resource,
        have: houseGood(house, resource),
        target: houseGoodTarget(house, resource, currentSeason(state)),
      })),
      nextName: upgrade ? HOUSE_TIERS[house.tier + 1].name : null,
      readiness: upgradeReadiness(state, house),
      upgrading: house.upgrade !== null,
      shortages: houseShortages(state, house),
      rangeTiles: serving ? serviceRangeTiles(serving.tile, servingRange) : null,
      burning: Boolean(house.fire),
      ruined: Boolean(house.ruined),
      rebuilding: Boolean(house.rebuild),
      rebuildMissing: rebuildCostMissing(state),
      shielded: protectingKontyna(state, house) !== null,
      hasWell: servingWell(state, house) !== null,
      stormDays: storm ? stormDaysLeft(state, storm) : null,
    };
  }

  const mound = state.mound;
  if (mound && moundTiles(mound).some((t) => atTile(t, tile))) {
    return {
      kind: 'mound',
      name: mound.name,
      done: mound.done,
      connected: footprintTouchesRoad('kopiec', mound.tile, state.roads),
      goods: (Object.entries(MOUND.cost) as [ResourceType, number][]).map(([resource, target]) => ({
        resource,
        have: mound.delivered[resource] ?? 0,
        target,
      })),
      builders: moundBuilders(state).length,
      missing: mound.done ? [] : moundMissing(state),
    };
  }

  const site = state.sites.find((s) => footprintContains(s.type, s.tile, tile));
  if (site) {
    const def = BUILDINGS[site.type];
    const have = Object.entries(site.delivered).reduce((sum, [, n]) => sum + (n ?? 0), 0);
    const need = Object.values(def.cost).reduce((sum, n) => sum + (n ?? 0), 0);
    return {
      kind: 'site',
      id: site.id,
      name: def.name,
      delivered: `${have}/${need}`,
      assignedWorkerId: site.assignedWorkerId,
    };
  }

  return null;
}
