import { Container, Graphics, Text } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';
import { isAdjacentToRoad } from '../sim/pathfinding';

const WAREHOUSE_COLOR = 0x6b4a2f;
const NO_ROAD_COLOR = 0xcc4433;

function tileCenterPixels(tile: Vec2): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 };
}

export interface WarehouseMarker {
  container: Container;
  update(roads: ReadonlySet<string>): void;
}

/** Placeholder warehouse building: a square with its first letter, per CLAUDE.md. */
export function createWarehouseMarker(tile: Vec2): WarehouseMarker {
  const container = new Container();
  const { x, y } = tileCenterPixels(tile);
  container.position.set(x, y);

  const size = TILE_SIZE * 0.8;
  const body = new Graphics()
    .rect(-size / 2, -size / 2, size, size)
    .fill(WAREHOUSE_COLOR)
    .rect(-size / 2, -size / 2, size, size)
    .stroke({ color: 0x3a2516, width: 3 });
  container.addChild(body);

  const label = new Text({
    text: 'M',
    style: { fill: 0xf4e9d8, fontSize: 28, fontWeight: 'bold', fontFamily: 'sans-serif' },
  });
  label.anchor.set(0.5);
  container.addChild(label);

  const noRoadIcon = new Graphics()
    .circle(0, -size / 2 - 6, 8)
    .fill(NO_ROAD_COLOR)
    .circle(0, -size / 2 - 6, 8)
    .stroke({ color: 0x5a1a12, width: 2 });
  noRoadIcon.visible = false;
  container.addChild(noRoadIcon);

  function update(roads: ReadonlySet<string>): void {
    noRoadIcon.visible = !isAdjacentToRoad(tile, roads);
  }

  return { container, update };
}
