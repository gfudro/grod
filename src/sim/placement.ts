import { BUILDINGS, type BuildingType } from '../data/buildings';
import { FOREST, MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { ResourceType } from '../data/resources';
import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { nextEntityId, takeFromWarehouse, warehouseAmount, type GameState } from './state';

export function canAfford(state: GameState, type: BuildingType): boolean {
  const cost = BUILDINGS[type].cost;
  return Object.entries(cost).every(
    ([resource, amount]) => warehouseAmount(state, resource as ResourceType) >= (amount ?? 0),
  );
}

export function canPlaceBuildingAt(state: GameState, tile: Vec2): boolean {
  if (tile.x < 0 || tile.y < 0 || tile.x >= MAP_WIDTH || tile.y >= MAP_HEIGHT) return false;
  if (TERRAIN[tile.y][tile.x] !== 'trawa') return false;
  if (tile.x === WAREHOUSE_TILE.x && tile.y === WAREHOUSE_TILE.y) return false;
  if (FOREST.some((tree) => tree.x === tile.x && tree.y === tile.y)) return false;
  if (state.roads.has(tileKey(tile))) return false;
  if (state.sites.some((site) => site.tile.x === tile.x && site.tile.y === tile.y)) return false;
  if (state.buildings.some((building) => building.tile.x === tile.x && building.tile.y === tile.y)) return false;
  return true;
}

export function tryPlaceConstructionSite(state: GameState, type: BuildingType, tile: Vec2): boolean {
  if (!canAfford(state, type)) return false;
  if (!canPlaceBuildingAt(state, tile)) return false;

  const cost = BUILDINGS[type].cost;
  for (const [resource, amount] of Object.entries(cost)) {
    takeFromWarehouse(state, resource as ResourceType, amount ?? 0);
  }

  state.sites.push({
    id: nextEntityId(state, 'plac'),
    type,
    tile: { ...tile },
    delivered: {},
    assignedWorkerId: null,
  });
  return true;
}
