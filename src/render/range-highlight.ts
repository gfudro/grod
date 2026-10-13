import { Container, Graphics } from 'pixi.js';
import { MAP_HEIGHT, MAP_WIDTH } from '../data/map';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';

const RANGE_FILL = 0x7fd0ff;
const RANGE_BORDER = 0x2f7fb8;

export interface RangeHighlight {
  container: Container;
  /** Shade these tiles (a service building's range); null hides it. */
  update(tiles: Vec2[] | null): void;
}

/** Draws a service range as shaded tiles, e.g. after tapping a studnia. */
export function createRangeHighlight(): RangeHighlight {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);

  function update(tiles: Vec2[] | null): void {
    graphics.clear();
    if (!tiles) return;
    drawRangeTiles(graphics, tiles);
  }

  return { container, update };
}

export function drawRangeTiles(graphics: Graphics, tiles: Vec2[]): void {
  for (const t of tiles) {
    if (t.x < 0 || t.y < 0 || t.x >= MAP_WIDTH || t.y >= MAP_HEIGHT) continue;
    graphics
      .rect(t.x * TILE_SIZE, t.y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
      .fill({ color: RANGE_FILL, alpha: 0.28 })
      .rect(t.x * TILE_SIZE + 1, t.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2)
      .stroke({ color: RANGE_BORDER, width: 1, alpha: 0.5 });
  }
}
