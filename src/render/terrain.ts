import { Container, Graphics } from 'pixi.js';
import { FOREST, MAP_HEIGHT, MAP_WIDTH, ROCKS, TERRAIN } from '../data/map';
import type { Season } from '../data/seasons';
import { ROCK_COLOR, SEASON_TERRAIN_COLOR, SEASON_TREE_COLOR, TILE_SIZE } from '../data/tiles';

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
        if (TERRAIN[y][x] === 'bagno') drawBog(tiles, x * TILE_SIZE, y * TILE_SIZE, x + y, season);
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
    for (const rock of ROCKS) drawRock(trees, rock.x * TILE_SIZE, rock.y * TILE_SIZE, season === 'zima');
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

/** Dark puddles and reeds; rusty streaks hint at the bog iron under them. */
function drawBog(graphics: Graphics, px: number, py: number, variant: number, season: Season): void {
  const frozen = season === 'zima';
  const puddle = frozen ? 0xb7cbd6 : 0x3b4f3a;
  const flip = variant % 2 === 0 ? 1 : -1;
  graphics
    .ellipse(px + TILE_SIZE * (0.5 - 0.15 * flip), py + TILE_SIZE * 0.35, 14, 8)
    .fill(puddle)
    .ellipse(px + TILE_SIZE * (0.5 + 0.18 * flip), py + TILE_SIZE * 0.7, 11, 6)
    .fill(puddle);
  if (!frozen) {
    graphics.ellipse(px + TILE_SIZE * (0.5 + 0.18 * flip), py + TILE_SIZE * 0.7, 6, 3).fill({ color: 0x8a4a22, alpha: 0.8 });
  }
  const reed = frozen ? 0x9a8f80 : season === 'jesien' ? 0xa08a3a : 0x6f8a3a;
  for (const [rx, ry] of [[0.2, 0.75], [0.8, 0.3], [0.3, 0.15]]) {
    const x = px + TILE_SIZE * (flip > 0 ? rx : 1 - rx);
    const y = py + TILE_SIZE * ry;
    graphics.rect(x - 1, y - 8, 2, 12).fill(reed).rect(x + 3, y - 6, 2, 10).fill(reed);
  }
}

/** A grey boulder for the kamieniarz, with a cap of snow in winter. */
function drawRock(graphics: Graphics, px: number, py: number, winter: boolean): void {
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  graphics
    .poly([cx - 22, cy + 14, cx - 18, cy - 6, cx - 6, cy - 16, cx + 12, cy - 14, cx + 22, cy - 2, cx + 20, cy + 14])
    .fill(ROCK_COLOR)
    .stroke({ color: 0x4a4e52, width: 2.5 })
    .moveTo(cx - 6, cy - 16)
    .lineTo(cx - 2, cy + 2)
    .lineTo(cx + 20, cy + 6)
    .stroke({ color: 0x6b7075, width: 2 });
  if (winter) graphics.ellipse(cx - 2, cy - 12, 14, 5).fill(SNOW_COLOR);
}

export const WORLD_PIXEL_WIDTH = MAP_WIDTH * TILE_SIZE;
export const WORLD_PIXEL_HEIGHT = MAP_HEIGHT * TILE_SIZE;
