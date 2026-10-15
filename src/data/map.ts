import { type TerrainType, type TreeType } from './tiles';
import type { Vec2 } from './types';

/**
 * The hand-made map (GDD "Zakres pierwszej wersji"), drawn as text:
 *   .  trawa (grass)        :  brzeg (riverbank)     ~  woda (river)
 *   =  bród (ford — a road may cross the river here) T  tree on grass
 *   b  bagno (bog with ruda darniowa)                R  rock on grass
 *
 * The top-left 20×14 is the original map of 0.1–0.10, tile for tile, so
 * older saves keep their gród exactly where it stood (0.11.0 grew the map
 * east and south around it). 0.15.0 added the bog and the rocky hill
 * past the ford for the kopiec's chains.
 */
const MAP_ROWS: readonly string[] = [
  'T.T.T.....:~~:......................',
  '.T.T.T....:~~:.............T.T.T.T..',
  'T.T.T......:~~:.............T.T.T.T.',
  '.T.T.T.....:~~:............T.T.T.T..',
  'T.T.T.......:~~:............T.T.T.T.',
  '............:~~:...........T.T.T.T..',
  '............:~~:............T.T.T.T.',
  '...........:~~:.....................',
  '...........:~~:.....................',
  '..........:~~:......................',
  '..........:~~:......................',
  '.........:~~:............R.R.R......',
  '.........:~~:...........R.R.R.R.....',
  '.........:~~:............R.R.R......',
  '.........:~~:.............R.R.......',
  '.........:~~:.......................',
  '.........:~~~::::...................',
  '..........:~~~~~~:::................',
  '...........::~~~~~~~::::............',
  '...bbb.......::::~~~~~~~::::........',
  '..bbbbb..........::::~~~=~~~::::....',
  '.bbbbbbb......T.T.T..::::~~~~~~~::::',
  '..bbbbb......T.T.T.T.....::::~~~~~~~',
  '...bb.........T.T.T..........::::~~~',
  '.............T.T.T.T.............:::',
  '....................................',
];

export const MAP_WIDTH = MAP_ROWS[0].length;
export const MAP_HEIGHT = MAP_ROWS.length;

export interface TreePlacement {
  x: number;
  y: number;
  type: TreeType;
}

const TERRAIN_CHAR: Record<string, TerrainType> = {
  '.': 'trawa',
  T: 'trawa',
  ':': 'brzeg',
  '~': 'woda',
  '=': 'brod',
  R: 'trawa',
  b: 'bagno',
};

function buildTerrain(): TerrainType[][] {
  return MAP_ROWS.map((row) => [...row].map((ch) => TERRAIN_CHAR[ch] ?? 'trawa'));
}

function buildForest(): TreePlacement[] {
  const treeTypes: TreeType[] = ['sosna', 'brzoza', 'dab'];
  const trees: TreePlacement[] = [];
  MAP_ROWS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === 'T') trees.push({ x, y, type: treeTypes[(x + y * 3) % treeTypes.length] });
    });
  });
  return trees;
}

function buildRocks(): Vec2[] {
  const rocks: Vec2[] = [];
  MAP_ROWS.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === 'R') rocks.push({ x, y });
    });
  });
  return rocks;
}

export const TERRAIN: TerrainType[][] = buildTerrain();
export const FOREST: TreePlacement[] = buildForest();
/** Boulders a kamieniarz breaks stone from (GDD M11). */
export const ROCKS: Vec2[] = buildRocks();
