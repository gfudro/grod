import { Container, Graphics } from 'pixi.js';
import { FOREST, MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import { TERRAIN_COLOR, TILE_SIZE, TREE_COLOR } from '../data/tiles';

export function buildTerrainLayer(): Container {
  const layer = new Container();

  const tiles = new Graphics();
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const color = TERRAIN_COLOR[TERRAIN[y][x]];
      tiles
        .rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE)
        .fill(color);
    }
  }
  layer.addChild(tiles);

  const trees = new Graphics();
  for (const tree of FOREST) {
    const cx = tree.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = tree.y * TILE_SIZE + TILE_SIZE / 2;
    const color = TREE_COLOR[tree.type];
    trees
      .circle(cx, cy, TILE_SIZE * 0.3)
      .fill(color)
      .circle(cx, cy, TILE_SIZE * 0.3)
      .stroke({ color: 0x1f3a22, width: 2 });
  }
  layer.addChild(trees);

  return layer;
}

export const WORLD_PIXEL_WIDTH = MAP_WIDTH * TILE_SIZE;
export const WORLD_PIXEL_HEIGHT = MAP_HEIGHT * TILE_SIZE;
