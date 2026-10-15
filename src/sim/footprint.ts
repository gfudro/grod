import { BUILDINGS, type BuildingType } from '../data/buildings';
import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { isAdjacentToRoad } from './pathfinding';
import type { GameState } from './state';

/** Every tile a building of this type covers when anchored (top-left) at `anchor`. */
export function footprintTiles(type: BuildingType, anchor: Vec2): Vec2[] {
  const { w, h } = BUILDINGS[type].footprint ?? { w: 1, h: 1 };
  const tiles: Vec2[] = [];
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      tiles.push({ x: anchor.x + dx, y: anchor.y + dy });
    }
  }
  return tiles;
}

export function footprintContains(type: BuildingType, anchor: Vec2, tile: Vec2): boolean {
  return footprintTiles(type, anchor).some((t) => t.x === tile.x && t.y === tile.y);
}

/** A building works only while at least one of its tiles touches a road. */
export function footprintTouchesRoad(type: BuildingType, anchor: Vec2, roads: ReadonlySet<string>): boolean {
  return footprintTiles(type, anchor).some((t) => isAdjacentToRoad(t, roads));
}

/** Keys of every tile taken by the warehouse, a site, a building, a house or the kopiec. */
export function occupiedTileKeys(state: GameState): Set<string> {
  const keys = new Set<string>([tileKey(WAREHOUSE_TILE)]);
  for (const site of state.sites) {
    for (const t of footprintTiles(site.type, site.tile)) keys.add(tileKey(t));
  }
  for (const building of state.buildings) {
    for (const t of footprintTiles(building.type, building.tile)) keys.add(tileKey(t));
  }
  for (const house of state.houses) keys.add(tileKey(house.tile));
  if (state.mound) {
    for (const t of footprintTiles('kopiec', state.mound.tile)) keys.add(tileKey(t));
  }
  return keys;
}
