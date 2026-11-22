import { Container, Graphics, Sprite } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import { isPixelStyle } from './style';
import { ART_SCALE, textureCache } from './pixel/canvas';
import { paintRoad, ROAD_E, ROAD_N, ROAD_S, ROAD_W } from './pixel/roads';

const ROAD_COLOR = 0xb08a52;
const ROAD_INSET = 10;

const pixelTexture = textureCache();

export interface RoadsLayer {
  container: Container;
  /** `winter`: snowy paths in the pixel look. */
  redraw(roads: ReadonlySet<string>, winter?: boolean): void;
}

export function createRoadsLayer(): RoadsLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);
  const tiles = new Container();
  container.addChild(tiles);
  const pool: Sprite[] = [];

  function redraw(roads: ReadonlySet<string>, winter = false): void {
    graphics.clear();
    const pixel = isPixelStyle();
    let used = 0;
    for (const key of roads) {
      const [xStr, yStr] = key.split(',');
      const x = Number(xStr);
      const y = Number(yStr);
      if (pixel) {
        // Each tile joins up with its neighbours: straights, bends, crossings.
        const mask =
          (roads.has(`${x},${y - 1}`) ? ROAD_N : 0) |
          (roads.has(`${x + 1},${y}`) ? ROAD_E : 0) |
          (roads.has(`${x},${y + 1}`) ? ROAD_S : 0) |
          (roads.has(`${x - 1},${y}`) ? ROAD_W : 0);
        let sprite = pool[used];
        if (!sprite) {
          sprite = new Sprite();
          sprite.scale.set(ART_SCALE);
          pool.push(sprite);
          tiles.addChild(sprite);
        }
        used++;
        sprite.visible = true;
        sprite.texture = pixelTexture(`road:${mask}:${winter}`, () => paintRoad(mask, winter));
        sprite.position.set(x * TILE_SIZE, y * TILE_SIZE);
        continue;
      }
      graphics
        .rect(
          x * TILE_SIZE + ROAD_INSET,
          y * TILE_SIZE + ROAD_INSET,
          TILE_SIZE - ROAD_INSET * 2,
          TILE_SIZE - ROAD_INSET * 2,
        )
        .fill(ROAD_COLOR);
    }
    for (let i = used; i < pool.length; i++) pool[i].visible = false;
  }

  return { container, redraw };
}
