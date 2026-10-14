import type { Season } from './seasons';
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

/**
 * Terrain and tree colours per season — the season is painted onto the
 * map in code rather than with separate winter sprites (CLAUDE.md).
 */
export const SEASON_TERRAIN_COLOR: Record<Season, Record<TerrainType, number>> = {
  wiosna: { trawa: 0x7fb84a, woda: 0x3f7fa8, brzeg: 0xd9c08a },
  lato: TERRAIN_COLOR,
  jesien: { trawa: 0xa39a45, woda: 0x3a7195, brzeg: 0xd2b47c },
  zima: { trawa: 0xe4ebf0, woda: 0x9cc3d9, brzeg: 0xdfe2e0 },
};

export const SEASON_TREE_COLOR: Record<Season, Record<TreeType, number>> = {
  wiosna: { sosna: 0x2f5d34, brzoza: 0x9fd07e, dab: 0x4f8a45 },
  lato: TREE_COLOR,
  jesien: { sosna: 0x2f5d34, brzoza: 0xe0b23a, dab: 0xc0662a },
  zima: { sosna: 0x2a4f30, brzoza: 0x9a8f80, dab: 0x7a6a55 },
};
