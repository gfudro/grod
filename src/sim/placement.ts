import { BUILDINGS, type BuildingType } from '../data/buildings';
import { FOREST, MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { ResourceType } from '../data/resources';
import { tileKey, type Vec2 } from '../data/types';
import { footprintTiles, occupiedTileKeys } from './footprint';
import { canStartMound, startMound } from './mound';
import { findResource, ROCK_KEYS } from './resource-tiles';
import { nextEntityId, takeFromWarehouse, warehouseAmount, type GameState } from './state';

export function canAfford(state: GameState, type: BuildingType): boolean {
  // The kopiec costs nothing up front; it waits for a dwór instead.
  if (BUILDINGS[type].kind === 'kopiec') return canStartMound(state);
  const cost = BUILDINGS[type].cost;
  return Object.entries(cost).every(
    ([resource, amount]) => warehouseAmount(state, resource as ResourceType) >= (amount ?? 0),
  );
}

export function canPlaceBuildingAt(state: GameState, type: BuildingType, tile: Vec2): boolean {
  const occupied = occupiedTileKeys(state);
  for (const t of footprintTiles(type, tile)) {
    if (t.x < 0 || t.y < 0 || t.x >= MAP_WIDTH || t.y >= MAP_HEIGHT) return false;
    if (TERRAIN[t.y][t.x] !== 'trawa') return false;
    if (FOREST.some((tree) => tree.x === t.x && tree.y === t.y)) return false;
    if (ROCK_KEYS.has(tileKey(t))) return false;
    if (state.roads.has(tileKey(t))) return false;
    if (occupied.has(tileKey(t))) return false;
  }

  const def = BUILDINGS[type];
  if (def.resourceSearch) {
    // The range is counted on foot over land, the way the worker will walk it.
    const found = findResource(tile, def.resourceSearch);
    if (!found || (def.maxResourceRange !== undefined && found.distance > def.maxResourceRange)) {
      return false;
    }
  }

  return true;
}

export function tryPlaceConstructionSite(state: GameState, type: BuildingType, tile: Vec2): boolean {
  if (!canAfford(state, type)) return false;
  if (!canPlaceBuildingAt(state, type, tile)) return false;

  if (BUILDINGS[type].kind === 'kopiec') {
    startMound(state, tile);
    return true;
  }

  const cost = BUILDINGS[type].cost;
  for (const [resource, amount] of Object.entries(cost)) {
    takeFromWarehouse(state, resource as ResourceType, amount ?? 0);
  }

  state.sites.push({
    id: nextEntityId(state, 'plac'),
    type,
    tile: { ...tile },
    delivered: {},
  });
  return true;
}
