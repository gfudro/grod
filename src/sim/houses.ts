import { BUILDINGS, type BuildingType } from '../data/buildings';
import { FIREWOOD, HOUSE_TIERS, type HouseTierDef } from '../data/houses';
import type { ResourceType } from '../data/resources';
import { SEASONS, type Season } from '../data/seasons';
import type { Vec2 } from '../data/types';
import { footprintTouchesRoad } from './footprint';
import { addChronicleFirst } from './chronicle';
import { isAdjacentToRoad } from './pathfinding';
import { houseGood, takeFromWarehouse, warehouseAmount, type Building, type GameState, type House } from './state';

export function houseTier(house: House): HouseTierDef {
  return HOUSE_TIERS[house.tier];
}

export function houseCapacity(house: House): number {
  return houseTier(house).capacity;
}

export function houseGoodTarget(house: House, resource: ResourceType, season: Season): number {
  const tierTarget = houseTier(house).goods[resource] ?? 0;
  if (resource === 'drewno' && SEASONS[season].stocksFirewood) return Math.max(tierTarget, FIREWOOD.target);
  return tierTarget;
}

/** Goods this house keeps receiving, in table order, plus firewood from autumn on. */
export function houseWantedGoods(house: House, season: Season): ResourceType[] {
  const goods = Object.keys(houseTier(house).goods) as ResourceType[];
  if (SEASONS[season].stocksFirewood && !goods.includes('drewno')) goods.push('drewno');
  return goods;
}

/** The tier's own goods are all full — what growing into the next tier takes. */
export function houseGoodsFull(house: House): boolean {
  return (Object.entries(houseTier(house).goods) as [ResourceType, number][]).every(
    ([resource, target]) => houseGood(house, resource) >= target,
  );
}

/** Square (Chebyshev) distance: the range drawn on the map is a square of tiles. */
export function inServiceRange(service: Vec2, range: number, tile: Vec2): boolean {
  return Math.abs(service.x - tile.x) <= range && Math.abs(service.y - tile.y) <= range;
}

/** Tiles covered by a service building's range, for drawing it on the map. */
export function serviceRangeTiles(center: Vec2, range: number): Vec2[] {
  const tiles: Vec2[] = [];
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      tiles.push({ x: center.x + dx, y: center.y + dy });
    }
  }
  return tiles;
}

/** A finished, road-connected service building of this type serving the house's tile. */
export function findServingBuilding(state: GameState, type: BuildingType, tile: Vec2): Building | null {
  const range = BUILDINGS[type].serviceRange ?? 0;
  return (
    state.buildings.find(
      (b) =>
        b.type === type &&
        footprintTouchesRoad(b.type, b.tile, state.roads) &&
        inServiceRange(b.tile, range, tile),
    ) ?? null
  );
}

export interface UpgradeReadiness {
  /** False on the top tier — there is nothing to grow into. */
  canGrow: boolean;
  /** The service building growing needs in range (studnia, plac), or null on the top tier. */
  service: BuildingType | null;
  goodsFull: boolean;
  serviceInRange: boolean;
  connected: boolean;
  canAffordCost: boolean;
  /** Materials the warehouse is short of for the rebuild, e.g. ['glina']. */
  missingCost: ResourceType[];
}

export function upgradeReadiness(state: GameState, house: House): UpgradeReadiness {
  const upgrade = houseTier(house).upgrade;
  if (!upgrade) {
    return {
      canGrow: false,
      service: null,
      goodsFull: houseGoodsFull(house),
      serviceInRange: false,
      connected: false,
      canAffordCost: false,
      missingCost: [],
    };
  }
  const missingCost = (Object.entries(upgrade.cost) as [ResourceType, number][])
    .filter(([resource, amount]) => warehouseAmount(state, resource) < amount)
    .map(([resource]) => resource);
  return {
    canGrow: true,
    service: upgrade.service,
    goodsFull: houseGoodsFull(house),
    serviceInRange: findServingBuilding(state, upgrade.service, house.tile) !== null,
    connected: isAdjacentToRoad(house.tile, state.roads),
    canAffordCost: missingCost.length === 0,
    missingCost,
  };
}

/**
 * Starts the rebuild of every house whose needs are all met. The cost
 * is paid from the warehouse right away (same rule as construction
 * sites); a free builder then carries it over and hammers.
 */
export function startReadyUpgrades(state: GameState): void {
  for (const house of state.houses) {
    if (house.upgrade || house.ruined || house.fire) continue;
    const ready = upgradeReadiness(state, house);
    if (!ready.canGrow || !ready.goodsFull || !ready.serviceInRange || !ready.connected || !ready.canAffordCost) {
      continue;
    }
    const cost = houseTier(house).upgrade!.cost;
    for (const [resource, amount] of Object.entries(cost)) {
      takeFromWarehouse(state, resource as ResourceType, amount ?? 0);
    }
    house.upgrade = { delivered: {}, assignedWorkerId: null };
  }
}

export function completeUpgrade(state: GameState, house: House): void {
  house.tier = Math.min(house.tier + 1, HOUSE_TIERS.length - 1);
  house.upgrade = null;
  if (house.tier === 1) addChronicleFirst(state, 'pierwsza-chata');
  if (house.tier === 2) addChronicleFirst(state, 'pierwsza-zagroda');
}
