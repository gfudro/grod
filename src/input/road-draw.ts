import type { FederatedPointerEvent } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import { MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import { TILE_SIZE } from '../data/tiles';
import { tileKey, type Vec2 } from '../data/types';
import { occupiedTileKeys } from '../sim/footprint';
import { eraseRoads, restoreRoads } from '../sim/roads';
import { setMapDragLock } from './drag-lock';
import type { GameState } from '../sim/state';

export interface RoadDrawController {
  setRoadMode(enabled: boolean): void;
  isRoadMode(): boolean;
  /** GUMKA: dragging a finger takes roads away instead of drawing them. */
  setEraseMode(enabled: boolean): void;
  isEraseMode(): boolean;
  undo(): void;
  canUndo(): boolean;
}

export function canBuildRoadOn(tile: Vec2): boolean {
  if (tile.x < 0 || tile.y < 0 || tile.x >= MAP_WIDTH || tile.y >= MAP_HEIGHT) return false;
  // 'brzeg' (riverbank) is walkable ground — it's the only tile type that
  // ever touches 'woda', so without it a rybak could never be reached by
  // road. Water itself stays unbuildable until bridges exist — except at
  // the bród, a shallow ford where a road may cross to the other bank.
  // The bagno is too soft for a road: a rudnik's digger wades in on foot.
  const terrain = TERRAIN[tile.y][tile.x];
  return terrain === 'trawa' || terrain === 'brzeg' || terrain === 'brod';
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
  let eraseMode = false;
  let drawing = false;
  let lastTile: Vec2 | null = null;
  let currentStroke: string[] = [];
  /** Each stroke remembers whether it drew or erased, so COFNIJ can reverse either. */
  const undoStack: { erased: boolean; keys: string[] }[] = [];

  const active = (): boolean => roadMode || eraseMode;

  function worldToTile(point: { x: number; y: number }): Vec2 {
    return { x: Math.floor(point.x / TILE_SIZE), y: Math.floor(point.y / TILE_SIZE) };
  }

  function paintTile(tile: Vec2): void {
    if (eraseMode) {
      currentStroke.push(...eraseRoads(state, [tileKey(tile)]));
      return;
    }
    if (!canBuildRoadOn(tile)) return;
    const key = tileKey(tile);
    if (state.roads.has(key)) return;
    if (occupiedTileKeys(state).has(key)) return; // no roads through buildings or fields
    state.roads.add(key);
    currentStroke.push(key);
  }

  function handlePointerDown(event: FederatedPointerEvent): void {
    if (!active()) return;
    drawing = true;
    currentStroke = [];
    const tile = worldToTile(viewport.toLocal(event.global));
    lastTile = tile;
    paintTile(tile);
    onRoadsChanged();
  }

  function handlePointerMove(event: FederatedPointerEvent): void {
    if (!active() || !drawing) return;
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
      undoStack.push({ erased: eraseMode, keys: currentStroke });
      onRoadsChanged();
    }
    currentStroke = [];
  }

  viewport.on('pointerdown', handlePointerDown);
  viewport.on('pointermove', handlePointerMove);
  viewport.on('pointerup', handlePointerUp);
  viewport.on('pointerupoutside', handlePointerUp);

  function setMode(road: boolean, erase: boolean): void {
    roadMode = road;
    eraseMode = erase;
    setMapDragLock(viewport, 'road', active());
    drawing = false;
    lastTile = null;
  }

  return {
    setRoadMode(enabled: boolean) {
      setMode(enabled, enabled ? false : eraseMode);
    },
    isRoadMode: () => roadMode,
    setEraseMode(enabled: boolean) {
      setMode(enabled ? false : roadMode, enabled);
    },
    isEraseMode: () => eraseMode,
    undo() {
      const stroke = undoStack.pop();
      if (!stroke) return;
      if (stroke.erased) restoreRoads(state, stroke.keys);
      else eraseRoads(state, stroke.keys);
      onRoadsChanged();
    },
    canUndo: () => undoStack.length > 0,
  };
}
