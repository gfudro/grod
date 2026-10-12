import type { FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import type { BuildingType } from '../data/buildings';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';
import { tryPlaceConstructionSite } from '../sim/placement';
import type { GameState } from '../sim/state';

export interface BuildPlacementController {
  armedType(): BuildingType | null;
  setArmed(type: BuildingType | null): void;
}

export function createBuildPlacementController(
  viewport: Viewport,
  state: GameState,
  onChanged: () => void,
): BuildPlacementController {
  let armed: BuildingType | null = null;

  function worldToTile(point: { x: number; y: number }): Vec2 {
    return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
  }

  function handlePointerDown(event: FederatedPointerEvent): void {
    if (!armed) return;
    const tile = worldToTile(viewport.toLocal(event.global));
    tryPlaceConstructionSite(state, armed, tile);
    setArmed(null);
    onChanged();
  }

  function setArmed(type: BuildingType | null): void {
    armed = type;
    if (armed) {
      viewport.plugins.pause('drag');
    } else {
      viewport.plugins.resume('drag');
    }
  }

  viewport.on('pointerdown', handlePointerDown);

  return {
    armedType: () => armed,
    setArmed,
  };
}
