export type TerrainType = 'trawa' | 'woda' | 'brzeg';

export const TILE_SIZE = 64;

export const TERRAIN_COLOR: Record<TerrainType, number> = {
  trawa: 0x6fa83f,
  woda: 0x3f7fa8,
  brzeg: 0xd9c08a,
};

export type TreeType = 'sosna' | 'brzoza' | 'dab';

export const TREE_COLOR: Record<TreeType, number> = {
  sosna: 0x2f5d34,
  brzoza: 0x7fae6e,
  dab: 0x3f6b3a,
};
