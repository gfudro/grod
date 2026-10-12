import { Container, Graphics, Text } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';

const WAREHOUSE_COLOR = 0x6b4a2f;
const WAYPOINT_COLOR = 0x9b4a3f;

function tileCenterPixels(tile: Vec2): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 };
}

/** Placeholder warehouse building: a square with its first letter, per CLAUDE.md. */
export function createWarehouseMarker(tile: Vec2): Container {
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

  return container;
}

/** Placeholder marker for the second M1 test waypoint — a small flag on a post. */
export function createWaypointMarker(tile: Vec2): Container {
  const container = new Container();
  const { x, y } = tileCenterPixels(tile);
  container.position.set(x, y);

  const graphics = new Graphics()
    .rect(-2, -22, 4, 30)
    .fill(0x4a3420)
    .poly([-2, -22, 20, -14, -2, -6])
    .fill(WAYPOINT_COLOR);
  container.addChild(graphics);

  return container;
}
