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
import { houseGood, type GameState, type PlotStage, type VillagerState } from './state';

export interface GoodCounter {
  resource: ResourceType;
  have: number;
  target: number;
}

export type InspectInfo =
  | { kind: 'warehouse'; connected: boolean; stock: Partial<Record<string, number>> }
  | { kind: 'site'; name: string; delivered: string; assignedWorkerId: string | null }
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
  process: 'mieli',
  deliver: 'nosi',
  arriving: 'osadnik w drodze',
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
    case 'idle':
      return WAREHOUSE_TILE;
  }
}

export function inspectTile(state: GameState, tile: Vec2): InspectInfo | null {
  const villager = state.villagers.find((v) => atTile(v.from, tile) && v.motion !== 'walking');
  if (villager) {
    return {
      kind: 'villager',
      description: describeVillager(villager),
      targetTile: villagerTargetTile(state, villager),
    };
  }

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
    return {
      kind: 'house',
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
    };
  }

  const site = state.sites.find((s) => footprintContains(s.type, s.tile, tile));
  if (site) {
    const def = BUILDINGS[site.type];
    const have = Object.entries(site.delivered).reduce((sum, [, n]) => sum + (n ?? 0), 0);
    const need = Object.values(def.cost).reduce((sum, n) => sum + (n ?? 0), 0);
    return {
      kind: 'site',
      name: def.name,
      delivered: `${have}/${need}`,
      assignedWorkerId: site.assignedWorkerId,
    };
  }

  return null;
}
