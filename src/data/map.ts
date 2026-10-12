import { type TerrainType, type TreeType } from './tiles';

export const MAP_WIDTH = 20;
export const MAP_HEIGHT = 14;

export interface TreePlacement {
  x: number;
  y: number;
  type: TreeType;
}

/**
 * Hand-authored first map: a river bending through grassland (łąka),
 * with a forest (las) in the top-left corner. River centre column per
 * row, width 2, with a sandy bank tile on either side.
 */
const RIVER_CENTER_BY_ROW: readonly number[] = [
  11, 11, 12, 12, 13, 13, 13, 12, 12, 11, 11, 10, 10, 10,
];

function buildTerrain(): TerrainType[][] {
  const grid: TerrainType[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const center = RIVER_CENTER_BY_ROW[y];
    const row: TerrainType[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      if (x === center || x === center + 1) {
        row.push('woda');
      } else if (x === center - 1 || x === center + 2) {
        row.push('brzeg');
      } else {
        row.push('trawa');
      }
    }
    grid.push(row);
  }
  return grid;
}

function buildForest(): TreePlacement[] {
  const treeTypes: TreeType[] = ['sosna', 'brzoza', 'dab'];
  const trees: TreePlacement[] = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 6; x++) {
      if ((x + y) % 2 === 0) {
        trees.push({ x, y, type: treeTypes[(x + y * 3) % treeTypes.length] });
      }
    }
  }
  return trees;
}

export const TERRAIN: TerrainType[][] = buildTerrain();
export const FOREST: TreePlacement[] = buildForest();
