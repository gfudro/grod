import type { FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';
import { inspectTile, type InspectInfo } from '../sim/inspect';
import type { GameState } from '../sim/state';

export function createInspectController(
  viewport: Viewport,
  state: GameState,
  isBlocked: () => boolean,
  onInspect: (info: InspectInfo | null) => void,
): void {
  function worldToTile(point: { x: number; y: number }): Vec2 {
    return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
  }

  function handlePointerDown(event: FederatedPointerEvent): void {
    if (isBlocked()) return;
    const tile = worldToTile(viewport.toLocal(event.global));
    onInspect(inspectTile(state, tile));
  }

  viewport.on('pointerdown', handlePointerDown);
}
