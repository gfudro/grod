import { Container, Graphics } from 'pixi.js';
import { FOREST, MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import type { Season } from '../data/seasons';
import { SEASON_TERRAIN_COLOR, SEASON_TREE_COLOR, TILE_SIZE } from '../data/tiles';

const SNOW_COLOR = 0xf4f7fb;

export interface TerrainLayer {
  container: Container;
  /** Repaints grass, water and trees in the colours of the season. */
  setSeason(season: Season): void;
}

export function createTerrainLayer(initialSeason: Season): TerrainLayer {
  const container = new Container();
  const tiles = new Graphics();
  const trees = new Graphics();
  container.addChild(tiles);
  container.addChild(trees);
  let shown: Season | null = null;

  function setSeason(season: Season): void {
    if (season === shown) return;
    shown = season;

    tiles.clear();
    const terrainColor = SEASON_TERRAIN_COLOR[season];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        tiles.rect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE).fill(terrainColor[TERRAIN[y][x]]);
        if (TERRAIN[y][x] === 'brod') drawFordStones(tiles, x * TILE_SIZE, y * TILE_SIZE);
      }
    }

    trees.clear();
    const treeColor = SEASON_TREE_COLOR[season];
    for (const tree of FOREST) {
      const cx = tree.x * TILE_SIZE + TILE_SIZE / 2;
      const cy = tree.y * TILE_SIZE + TILE_SIZE / 2;
      trees
        .circle(cx, cy, TILE_SIZE * 0.3)
        .fill(treeColor[tree.type])
        .circle(cx, cy, TILE_SIZE * 0.3)
        .stroke({ color: 0x1f3a22, width: 2 });
      if (season === 'zima') {
        trees.circle(cx - 4, cy - 6, TILE_SIZE * 0.14).fill(SNOW_COLOR);
      }
    }
  }

  setSeason(initialSeason);
  return { container, setSeason };
}

/** Stepping stones across the shallow ford, so it reads as "you can cross here". */
function drawFordStones(graphics: Graphics, px: number, py: number): void {
  for (const [fx, fy] of [[0.25, 0.3], [0.6, 0.22], [0.4, 0.62], [0.75, 0.7]]) {
    graphics
      .ellipse(px + fx * TILE_SIZE, py + fy * TILE_SIZE, 9, 6)
      .fill(0xb8b0a0)
      .stroke({ color: 0x6b6258, width: 2 });
  }
}

export const WORLD_PIXEL_WIDTH = MAP_WIDTH * TILE_SIZE;
export const WORLD_PIXEL_HEIGHT = MAP_HEIGHT * TILE_SIZE;
