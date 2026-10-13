import type { FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import { MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import { TILE_SIZE } from '../data/tiles';
import { tileKey, type Vec2 } from '../data/types';
import { occupiedTileKeys } from '../sim/footprint';
import type { GameState } from '../sim/state';

export interface RoadDrawController {
  setRoadMode(enabled: boolean): void;
  isRoadMode(): boolean;
  undo(): void;
  canUndo(): boolean;
}

export function canBuildRoadOn(tile: Vec2): boolean {
  if (tile.x < 0 || tile.y < 0 || tile.x >= MAP_WIDTH || tile.y >= MAP_HEIGHT) return false;
  // 'brzeg' (riverbank) is walkable ground — it's the only tile type that
  // ever touches 'woda', so without it a rybak could never be reached by
  // road. Water itself stays unbuildable until bridges exist.
  const terrain = TERRAIN[tile.y][tile.x];
  return terrain === 'trawa' || terrain === 'brzeg';
}

/**
 * Line rasterisation that only ever steps one axis at a time, so a fast
 * diagonal swipe still produces a 4-directionally connected road — the
 * villager's A* can't cut across a diagonal gap between tile corners.
 */
function tilesBetween(a: Vec2, b: Vec2): Vec2[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const sx = dx > 0 ? 1 : -1;
  const sy = dy > 0 ? 1 : -1;

  let x = a.x;
  let y = a.y;
  let stepsX = 0;
  let stepsY = 0;
  const tiles: Vec2[] = [{ x, y }];

  while (stepsX < absDx || stepsY < absDy) {
    const dueX = stepsX < absDx && stepsX / (absDx || 1) <= stepsY / (absDy || 1);
    if (dueX) {
      x += sx;
      stepsX += 1;
    } else {
      y += sy;
      stepsY += 1;
    }
    tiles.push({ x, y });
  }

  return tiles;
}

export function createRoadDrawController(
  viewport: Viewport,
  state: GameState,
  onRoadsChanged: () => void,
): RoadDrawController {
  let roadMode = false;
  let drawing = false;
  let lastTile: Vec2 | null = null;
  let currentStroke: string[] = [];
  const undoStack: string[][] = [];

  function worldToTile(point: { x: number; y: number }): Vec2 {
    return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
  }

  function paintTile(tile: Vec2): void {
    if (!canBuildRoadOn(tile)) return;
    const key = tileKey(tile);
    if (state.roads.has(key)) return;
    if (occupiedTileKeys(state).has(key)) return; // no roads through buildings or fields
    state.roads.add(key);
    currentStroke.push(key);
  }

  function handlePointerDown(event: FederatedPointerEvent): void {
    if (!roadMode) return;
    drawing = true;
    currentStroke = [];
    const tile = worldToTile(viewport.toLocal(event.global));
    lastTile = tile;
    paintTile(tile);
    onRoadsChanged();
  }

  function handlePointerMove(event: FederatedPointerEvent): void {
    if (!roadMode || !drawing) return;
    const tile = worldToTile(viewport.toLocal(event.global));
    if (lastTile && tile.x === lastTile.x && tile.y === lastTile.y) return;
    const segment = lastTile ? tilesBetween(lastTile, tile) : [tile];
    for (const t of segment) paintTile(t);
    lastTile = tile;
    onRoadsChanged();
  }

  function handlePointerUp(): void {
    if (!drawing) return;
    drawing = false;
    lastTile = null;
    if (currentStroke.length > 0) {
      undoStack.push(currentStroke);
      onRoadsChanged();
    }
    currentStroke = [];
  }

  viewport.on('pointerdown', handlePointerDown);
  viewport.on('pointermove', handlePointerMove);
  viewport.on('pointerup', handlePointerUp);
  viewport.on('pointerupoutside', handlePointerUp);

  return {
    setRoadMode(enabled: boolean) {
      roadMode = enabled;
      if (enabled) {
        viewport.plugins.pause('drag');
      } else {
        viewport.plugins.resume('drag');
        drawing = false;
        lastTile = null;
      }
    },
    isRoadMode: () => roadMode,
    undo() {
      const stroke = undoStack.pop();
      if (!stroke) return;
      for (const key of stroke) state.roads.delete(key);
      onRoadsChanged();
    },
    canUndo: () => undoStack.length > 0,
  };
}
