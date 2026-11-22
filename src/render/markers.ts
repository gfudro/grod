import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';
import { isAdjacentToRoad } from '../sim/pathfinding';
import { isPixelStyle } from './style';
import { ART_SCALE, textureCache } from './pixel/canvas';
import { paintWarehouse, ROOF_ROOM } from './pixel/buildings';

const pixelTexture = textureCache();

const WAREHOUSE_COLOR = 0x6b4a2f;
const NO_ROAD_COLOR = 0xcc4433;

function tileCenterPixels(tile: Vec2): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE + TILE_SIZE / 2, y: tile.y * TILE_SIZE + TILE_SIZE / 2 };
}

export interface WarehouseMarker {
  container: Container;
  /** `winter`: snow on the roof in the pixel look. */
  update(roads: ReadonlySet<string>, winter?: boolean): void;
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

  const pixelSprite = new Sprite();
  pixelSprite.scale.set(ART_SCALE);
  pixelSprite.position.set(-TILE_SIZE / 2, -TILE_SIZE / 2 - ROOF_ROOM * ART_SCALE);
  container.addChild(pixelSprite);

  const noRoadIcon = new Graphics()
    .circle(0, -size / 2 - 6, 8)
    .fill(NO_ROAD_COLOR)
    .circle(0, -size / 2 - 6, 8)
    .stroke({ color: 0x5a1a12, width: 2 });
  noRoadIcon.visible = false;
  container.addChild(noRoadIcon); // added after the sprite, so it stays on top

  function update(roads: ReadonlySet<string>, winter = false): void {
    noRoadIcon.visible = !isAdjacentToRoad(tile, roads);
    const pixel = isPixelStyle();
    body.visible = !pixel;
    label.visible = !pixel;
    pixelSprite.visible = pixel;
    if (pixel) pixelSprite.texture = pixelTexture(`warehouse:${winter}`, () => paintWarehouse(winter));
  }

  return { container, update };
}
