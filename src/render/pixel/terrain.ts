import { FOREST, MAP_HEIGHT, MAP_WIDTH, ROCKS, TERRAIN } from '../../data/map';
import type { Season } from '../../data/seasons';
import type { TerrainType, TreeType } from '../../data/tiles';
import { ART_TILE, hash, mix, PixelCanvas } from './canvas';

interface GroundPalette {
  base: number;
  light: number;
  dark: number;
  /** Little dots scattered on the grass: flowers, fallen leaves, grass tips in snow. */
  specks: number[];
}

const GRASS: Record<Season, GroundPalette> = {
  wiosna: { base: 0x6fb342, light: 0x8fcf55, dark: 0x4f8f32, specks: [0xf7f4e8, 0xf5d342] },
  lato: { base: 0x5f9e38, light: 0x7dbb46, dark: 0x447a2c, specks: [0xe25a4a, 0x8fa8e8] },
  jesien: { base: 0x948f3e, light: 0xada64c, dark: 0x6f6a2e, specks: [0xc0662a, 0xe0a030] },
  zima: { base: 0xe6edf2, light: 0xffffff, dark: 0xc5d3de, specks: [0x8a9a7a, 0xa9b8c4] },
};

const SAND: Record<Season, GroundPalette> = {
  wiosna: { base: 0xd9c08a, light: 0xe8d4a2, dark: 0xb89c66, specks: [0x9a8f80] },
  lato: { base: 0xdcc48e, light: 0xecd9a8, dark: 0xbaa06a, specks: [0x9a8f80] },
  jesien: { base: 0xcfb37c, light: 0xdfc894, dark: 0xaa8f5c, specks: [0x8a7f70] },
  zima: { base: 0xdfe6ea, light: 0xf4f8fa, dark: 0xc3ced6, specks: [0xb8a888] },
};

const BOG: Record<Season, GroundPalette> = {
  wiosna: { base: 0x557038, light: 0x6c8a45, dark: 0x3e5528, specks: [0xe8e0a0] },
  lato: { base: 0x4f6535, light: 0x667e42, dark: 0x3a4b27, specks: [0xd8d0f0] },
  jesien: { base: 0x655f33, light: 0x7d7540, dark: 0x4b4626, specks: [0xa86a2a] },
  zima: { base: 0xd3dcd8, light: 0xeef3f1, dark: 0xb3c1bb, specks: [0x8a8a6a] },
};

interface WaterPalette {
  deep: number;
  mid: number;
  shallow: number;
  foam: number;
  ripple: number;
}

const WATER: Record<Season, WaterPalette> = {
  wiosna: { deep: 0x2f6f9a, mid: 0x3a7fab, shallow: 0x5c9fc4, foam: 0xc4e6f2, ripple: 0x7fc0e0 },
  lato: { deep: 0x2c6c98, mid: 0x387daa, shallow: 0x5aa2c6, foam: 0xc8eaf4, ripple: 0x86c6e4 },
  jesien: { deep: 0x29607f, mid: 0x336f92, shallow: 0x4f8fae, foam: 0xb8d8e4, ripple: 0x6fa8c4 },
  // Frozen over: pale ice with white streaks and blue cracks.
  zima: { deep: 0x9cc6dc, mid: 0xaed2e4, shallow: 0xc6e1ee, foam: 0xeef7fb, ripple: 0xf6fbfd },
};

/** Ground codes on the art-pixel grid (after the borders are roughened). */
const GRASS_ID = 0;
const SAND_ID = 1;
const WATER_ID = 2;
const FORD_ID = 3;
const BOG_ID = 4;
const TERRAIN_ID: Record<TerrainType, number> = { trawa: GRASS_ID, brzeg: SAND_ID, woda: WATER_ID, brod: FORD_ID, bagno: BOG_ID };

/**
 * Paints the whole map, one art pixel at a time, for one season: grass,
 * sand, river, ford and bog with soft ragged borders, then trees and
 * rocks on top. Drawn once per season and shown as a single sprite.
 */
export function paintTerrain(season: Season): PixelCanvas {
  const W = MAP_WIDTH * ART_TILE;
  const H = MAP_HEIGHT * ART_TILE;
  const canvas = new PixelCanvas(W, H);

  // Which ground each art pixel shows. Each pixel weighs the four nearest
  // tile centres (bilinear), so the river and bog get rounded, diagonal
  // banks instead of tile staircases; a little blocky jitter makes them ragged.
  const ground = new Uint8Array(W * H);
  const weights = new Float32Array(5);
  const tileId = (tx: number, ty: number): number =>
    TERRAIN_ID[TERRAIN[Math.min(MAP_HEIGHT - 1, Math.max(0, ty))][Math.min(MAP_WIDTH - 1, Math.max(0, tx))]];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const jx = (hash(x >> 1, y >> 1, 11) - 0.5) * 4;
      const jy = (hash(x >> 1, y >> 1, 12) - 0.5) * 4;
      const u = (x + 0.5 + jx) / ART_TILE - 0.5;
      const v = (y + 0.5 + jy) / ART_TILE - 0.5;
      const tx = Math.floor(u);
      const ty = Math.floor(v);
      const fx = u - tx;
      const fy = v - ty;
      weights.fill(0);
      weights[tileId(tx, ty)] += (1 - fx) * (1 - fy);
      weights[tileId(tx + 1, ty)] += fx * (1 - fy);
      weights[tileId(tx, ty + 1)] += (1 - fx) * fy;
      weights[tileId(tx + 1, ty + 1)] += fx * fy;
      // The tile under the pixel wins ties, so single tiles (the ford) keep their shape.
      const own = tileId(Math.floor((x + jx) / ART_TILE), Math.floor((y + jy) / ART_TILE));
      weights[own] += 0.12;
      let best = 0;
      for (let k = 1; k < 5; k++) if (weights[k] > weights[best]) best = k;
      ground[y * W + x] = best;
    }
  }
  const at = (x: number, y: number): number =>
    ground[Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))];
  const isWet = (id: number): boolean => id === WATER_ID || id === FORD_ID;
  /** Is there dry land within `d` pixels (on the cross)? */
  const landNear = (x: number, y: number, d: number): boolean =>
    !isWet(at(x - d, y)) || !isWet(at(x + d, y)) || !isWet(at(x, y - d)) || !isWet(at(x, y + d));

  const water = WATER[season];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const id = ground[y * W + x];
      if (isWet(id)) {
        canvas.px(x, y, waterPixel(x, y, id === FORD_ID, water, landNear));
      } else {
        const palette = id === SAND_ID ? SAND[season] : id === BOG_ID ? BOG[season] : GRASS[season];
        let color = groundPixel(x, y, palette);
        // Wet, darker sand right at the water's edge.
        if (id === SAND_ID && (isWet(at(x - 1, y)) || isWet(at(x + 1, y)) || isWet(at(x, y + 1)) || isWet(at(x, y - 1)))) {
          color = season === 'zima' ? 0xb9c9d2 : mix(palette.dark, 0x5a4a30, 0.25);
        }
        canvas.px(x, y, color);
      }
    }
  }

  decorateGround(canvas, ground, W, season);

  for (let ty = 0; ty < MAP_HEIGHT; ty++) {
    for (let tx = 0; tx < MAP_WIDTH; tx++) {
      const terrain = TERRAIN[ty][tx];
      if (terrain === 'brod') paintFordStones(canvas, tx * ART_TILE, ty * ART_TILE, season);
      if (terrain === 'bagno') paintBog(canvas, tx * ART_TILE, ty * ART_TILE, tx * 7 + ty * 3, season);
    }
  }

  // Trees and rocks back to front, so a lower one overlaps the one above it.
  const things = [
    ...FOREST.map((t) => ({ x: t.x, y: t.y, paint: () => treeSprite(t.type, season, t.x + t.y) })),
    ...ROCKS.map((r) => ({ x: r.x, y: r.y, paint: () => rockSprite(season, r.x * 3 + r.y) })),
  ].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const thing of things) {
    const sprite = thing.paint();
    const left = thing.x * ART_TILE + (ART_TILE - sprite.w) / 2;
    const top = (thing.y + 1) * ART_TILE - sprite.h + 1;
    // A soft shadow on the ground, cast down-right (light from the top-left).
    const cx = thing.x * ART_TILE + ART_TILE / 2 + 3;
    const cy = (thing.y + 1) * ART_TILE - 3;
    for (let y = cy - 4; y <= cy + 4; y++) {
      for (let x = cx - 13; x <= cx + 13; x++) {
        const dx = (x - cx) / 13;
        const dy = (y - cy) / 4;
        if (dx * dx + dy * dy <= 1) canvas.shade(x, y, 0.22);
      }
    }
    canvas.blit(sprite, left, top);
  }

  return canvas;
}

function groundPixel(x: number, y: number, p: GroundPalette): number {
  // Chunky 4×4 patches of a slightly different tone, then single-pixel grain.
  const patch = hash(x >> 2, y >> 2, 3);
  let color = patch < 0.18 ? mix(p.base, p.light, 0.35) : patch > 0.85 ? mix(p.base, p.dark, 0.35) : p.base;
  const grain = hash(x, y, 4);
  if (grain < 0.05) color = p.dark;
  else if (grain < 0.09) color = p.light;
  return color;
}

function waterPixel(
  x: number,
  y: number,
  ford: boolean,
  p: WaterPalette,
  landNear: (x: number, y: number, d: number) => boolean,
): number {
  if (landNear(x, y, 1)) return p.foam;
  if (ford || landNear(x, y, 3)) {
    return hash(x, y, 5) < 0.08 ? p.foam : p.shallow;
  }
  let color = hash(x >> 3, y >> 2, 6) < 0.45 ? p.mid : p.deep;
  // Short horizontal glints, like light on a slow river.
  if (y % 5 === 0 && hash((x + y * 3) >> 2, y, 7) < 0.22) color = p.ripple;
  return color;
}

/** Tufts of grass, flowers, fallen leaves or grass tips poking through snow. */
function decorateGround(canvas: PixelCanvas, ground: Uint8Array, W: number, season: Season): void {
  const H = ground.length / W;
  const g = GRASS[season];
  for (let cy = 0; cy < H; cy += 8) {
    for (let cx = 0; cx < W; cx += 8) {
      const x = cx + Math.floor(hash(cx, cy, 20) * 6) + 1;
      const y = cy + Math.floor(hash(cx, cy, 21) * 6) + 2;
      if (ground[y * W + x] !== GRASS_ID) continue;
      const roll = hash(cx, cy, 22);
      if (roll < 0.35) {
        // A tuft: two dark blades and a light one between them.
        canvas.px(x, y, g.dark);
        canvas.px(x + 2, y, g.dark);
        canvas.px(x + 1, y - 1, g.light);
        canvas.px(x + 1, y, g.light);
      } else if (roll < 0.43) {
        const speck = g.specks[Math.floor(hash(cx, cy, 23) * g.specks.length)];
        canvas.px(x, y, speck);
        if (season !== 'zima') {
          canvas.px(x + 1, y, speck);
          canvas.px(x, y + 1, g.dark);
        }
      }
    }
  }
}

function paintFordStones(canvas: PixelCanvas, px: number, py: number, season: Season): void {
  const stone = season === 'zima' ? 0xe6edf2 : 0xb8b0a0;
  for (const [fx, fy] of [[0.25, 0.3], [0.62, 0.22], [0.4, 0.62], [0.76, 0.72]]) {
    const cx = px + fx * ART_TILE;
    const cy = py + fy * ART_TILE;
    canvas.ellipse(cx + 0.5, cy + 1, 5, 3.4, 0x4a5a66);
    canvas.ellipse(cx, cy, 4.4, 3, 0x6b6258);
    canvas.ellipse(cx - 0.5, cy - 0.5, 3.6, 2.2, stone);
    canvas.px(cx - 2, cy - 1, 0xffffff);
  }
}

/** Dark puddles with a glint, rusty streaks of bog iron, reeds with cattails. */
function paintBog(canvas: PixelCanvas, px: number, py: number, variant: number, season: Season): void {
  const frozen = season === 'zima';
  const flip = variant % 2 === 0 ? 1 : -1;
  const puddles: [number, number, number, number][] = [
    [0.5 - 0.15 * flip, 0.35, 8, 4],
    [0.5 + 0.18 * flip, 0.72, 6, 3],
  ];
  for (const [fx, fy, rx, ry] of puddles) {
    const cx = px + fx * ART_TILE;
    const cy = py + fy * ART_TILE;
    canvas.ellipse(cx, cy, rx + 1, ry + 1, frozen ? 0x9fb4be : 0x2c3a22);
    canvas.ellipse(cx, cy, rx, ry, frozen ? 0xc4d8e2 : 0x2e4440);
    canvas.hline(cx - rx + 2, cx - rx + 4, cy - ry + 1, frozen ? 0xffffff : 0x6f8f88);
  }
  if (!frozen) {
    const cx = px + (0.5 + 0.18 * flip) * ART_TILE;
    const cy = py + 0.72 * ART_TILE;
    canvas.hline(cx - 3, cx + 2, cy, 0x8a4a22).hline(cx - 1, cx + 3, cy + 1, 0xa85a2a);
  }
  const reed = frozen ? 0x9a8f80 : season === 'jesien' ? 0xa08a3a : 0x6f8a3a;
  const reedDark = frozen ? 0x7a6f60 : 0x4a5f28;
  for (const [rx, ry] of [[0.18, 0.78], [0.82, 0.3], [0.3, 0.14], [0.88, 0.9]]) {
    const x = Math.round(px + ART_TILE * (flip > 0 ? rx : 1 - rx));
    const y = Math.round(py + ART_TILE * ry);
    canvas.vline(x, y - 6, y, reed).vline(x + 2, y - 4, y, reedDark).vline(x - 2, y - 3, y, reed);
    // A brown cattail head on the tallest reed.
    canvas.vline(x, y - 8, y - 6, 0x5a3a1f);
    if (frozen) canvas.px(x, y - 9, 0xffffff);
  }
}

interface CanopyColors {
  dark: number;
  mid: number;
  light: number;
}

const BIRCH_LEAVES: Record<Season, CanopyColors | null> = {
  wiosna: { dark: 0x5a9a35, mid: 0x7fbf48, light: 0xb5e57a },
  lato: { dark: 0x3f7f30, mid: 0x5f9f40, light: 0x8fca60 },
  jesien: { dark: 0xb07a18, mid: 0xe0b23a, light: 0xf8dc78 },
  zima: null,
};

const OAK_LEAVES: Record<Season, CanopyColors | null> = {
  wiosna: { dark: 0x386f2c, mid: 0x55933a, light: 0x82c050 },
  lato: { dark: 0x2a5e28, mid: 0x417a32, light: 0x67a444 },
  jesien: { dark: 0x8a3418, mid: 0xbc5e26, light: 0xe8a040 },
  zima: null,
};

const PINE = { dark: 0x1c4428, mid: 0x2c6236, light: 0x4a8a44 };

/** One tree, 32 wide and taller than a tile; its trunk stands on the tile's bottom edge. */
function treeSprite(type: TreeType, season: Season, variant: number): PixelCanvas {
  const c = new PixelCanvas(32, 46);
  const winter = season === 'zima';
  if (type === 'sosna') {
    c.rect(14, 36, 4, 9, 0x5a3a1f).vline(14, 36, 44, 0x7a5030);
    const tiers: [number, number, number][] = [
      [2, 16, 7],
      [8, 25, 10],
      [15, 36, 13],
    ];
    for (const [apex, base, half] of tiers) {
      c.poly([16, apex, 16 + half, base, 16 - half, base], PINE.dark);
      c.poly([16, apex, 16 + 2, base - 1, 16 - half + 1, base - 1], PINE.mid);
      c.line(16, apex + 1, 16 - half + 2, base - 2, PINE.light);
      // A jagged lower fringe of needles.
      for (let x = 16 - half + 1; x <= 16 + half - 1; x += 3) c.px(x, base, PINE.dark);
      if (winter) {
        c.poly([16, apex, 16 + half * 0.55, apex + (base - apex) * 0.55, 16 - half * 0.7, apex + (base - apex) * 0.6], 0xf4f8fb);
        c.line(16 - half + 2, base - 2, 16 - half + 5, base - 3, 0xffffff);
      }
    }
  } else if (type === 'brzoza') {
    const lean = variant % 2 === 0 ? 0 : 1;
    c.rect(15 + lean, 22, 3, 23, 0xeeeae0).vline(17 + lean, 22, 44, 0xc8c2b4);
    for (let y = 24; y < 44; y += 4) c.hline(15 + lean, 16 + lean + ((y >> 2) % 2), y + ((y * 7) % 3), 0x2a2a2a);
    const leaves = BIRCH_LEAVES[season];
    if (leaves) {
      c.blob(16, 18, 9, 10, leaves.dark, leaves.mid, leaves.light);
      c.blob(10, 24, 6, 6, leaves.dark, leaves.mid, leaves.light);
      c.blob(23, 23, 6, 6, leaves.dark, leaves.mid, leaves.light);
      c.blob(17, 9, 6, 6, leaves.dark, leaves.mid, leaves.light);
    } else {
      bareBranches(c, 16 + lean, 22, 0x8a8278, 0x6a645a);
    }
  } else {
    c.rect(13, 30, 6, 15, 0x5a3a1f).rect(13, 30, 2, 15, 0x7a5030);
    c.px(12, 44, 0x5a3a1f).px(19, 44, 0x5a3a1f);
    const leaves = OAK_LEAVES[season];
    if (leaves) {
      c.blob(16, 21, 14, 11, leaves.dark, leaves.mid, leaves.light);
      c.blob(7, 25, 7, 6, leaves.dark, leaves.mid, leaves.light);
      c.blob(25, 25, 7, 6, leaves.dark, leaves.mid, leaves.light);
      c.blob(15, 11, 10, 8, leaves.dark, leaves.mid, leaves.light);
      // A few acorn-dark clusters for depth.
      c.px(20, 26, leaves.dark).px(21, 27, leaves.dark).px(9, 18, leaves.dark);
    } else {
      bareBranches(c, 16, 30, 0x5a3a1f, 0x3e2814);
      c.line(16, 30, 4, 18, 0x5a3a1f).line(16, 30, 28, 16, 0x5a3a1f);
    }
  }
  return c.outline(0x1a2414);
}

/** Winter: bare branches spreading up from the trunk, with a little snow on them. */
function bareBranches(c: PixelCanvas, x: number, y: number, color: number, dark: number): void {
  c.line(x, y, x, y - 18, color);
  c.line(x, y - 4, x - 9, y - 14, color).line(x - 5, y - 9, x - 7, y - 19, dark);
  c.line(x, y - 6, x + 9, y - 15, color).line(x + 5, y - 10, x + 8, y - 20, dark);
  c.line(x, y - 12, x - 4, y - 21, dark).line(x, y - 14, x + 4, y - 22, dark);
  for (const [sx, sy] of [[x - 8, y - 14], [x + 8, y - 15], [x, y - 18], [x - 6, y - 19]]) c.px(sx, sy - 1, 0xffffff);
}

function rockSprite(season: Season, variant: number): PixelCanvas {
  const c = new PixelCanvas(32, 28);
  const flip = variant % 2 === 0;
  const bx = flip ? 14 : 17;
  c.blob(bx, 16, 12, 9, 0x5d6267, 0x8c9196, 0xb5babe);
  c.blob(flip ? 25 : 6, 21, 6, 4, 0x5d6267, 0x868b90, 0xaeb3b8);
  c.line(bx - 2, 9, bx + 1, 15, 0x4a4e52).line(bx + 1, 15, bx + 7, 17, 0x4a4e52);
  if (season === 'zima') c.ellipse(bx - 2, 9, 8, 3, 0xf4f8fb).hline(bx - 6, bx - 2, 8, 0xffffff);
  else if (season !== 'jesien') c.px(bx + 6, 22, 0x4f8f32).px(bx + 7, 22, 0x6fb342);
  return c.outline(0x2a2c2e);
}
