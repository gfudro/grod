import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';

const ROAD_COLOR = 0xb08a52;
const ROAD_INSET = 10;

export interface RoadsLayer {
  container: Container;
  redraw(roads: ReadonlySet<string>): void;
}

export function createRoadsLayer(): RoadsLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);

  function redraw(roads: ReadonlySet<string>): void {
    graphics.clear();
    for (const key of roads) {
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      graphics
        .rect(
          x * TILE_SIZE + ROAD_INSET,
          y * TILE_SIZE + ROAD_INSET,
          TILE_SIZE - ROAD_INSET * 2,
          TILE_SIZE - ROAD_INSET * 2,
        )
        .fill(ROAD_COLOR);
    }
  }

  return { container, redraw };
}
