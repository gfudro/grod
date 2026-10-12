import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';

const HIGHLIGHT_COLOR = 0xffd34d;

export interface TargetHighlight {
  container: Container;
  update(tile: Vec2 | null): void;
}

/** A ring shown on the map to answer "where is this worker/building headed?". */
export function createTargetHighlight(): TargetHighlight {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);
  container.visible = false;

  function update(tile: Vec2 | null): void {
    if (!tile) {
      container.visible = false;
      return;
    }
    container.visible = true;
    const cx = tile.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = tile.y * TILE_SIZE + TILE_SIZE / 2;
    graphics.clear().circle(cx, cy, TILE_SIZE * 0.42).stroke({ color: HIGHLIGHT_COLOR, width: 5 });
  }

  return { container, update };
}
