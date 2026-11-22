import type { BuildingType } from '../../data/buildings';
import type { PlotStage } from '../../sim/state';
import { ART_TILE, hash, PixelCanvas } from './canvas';

/** Art pixels a building may rise above its tile (roofs, poles, smoke). */
export const ROOF_ROOM = 14;

const OUTLINE = 0x24180e;
const SNOW = 0xf4f8fb;
const SNOW_SHADE = 0xc8d6e0;

const LOG = { dark: 0x4e321a, mid: 0x7a5230, light: 0x9a6a3e, end: 0xd2a46a, endDark: 0x9a7040 };
const PLANK = { dark: 0x5a3c20, mid: 0x86592f, light: 0xa8743e };
const THATCH = { dark: 0x94762e, mid: 0xc9a24a, light: 0xe8ca72 };
const SHINGLE = { dark: 0x5a2c16, mid: 0x8a4a26, light: 0xb4703a };
const DARK_SHINGLE = { dark: 0x2e2a2e, mid: 0x4a4048, light: 0x6a5e66 };
const TURF = { dark: 0x45602a, mid: 0x628236, light: 0x86a64a };
const STONE = { dark: 0x5d6267, mid: 0x8c9196, light: 0xb8bdc2 };
const CLAY = { dark: 0x8a3e2a, mid: 0xb5594a, light: 0xd88a62 };
const DOOR = 0x2e1c0e;
const DIRT = 0x8a6a42;

interface RoofColors {
  dark: number;
  mid: number;
  light: number;
}

/** A fresh sprite canvas for a w×h-tile footprint; drawing (0, 0) is the tile's top-left. */
function sprite(w = 1, h = 1): PixelCanvas {
  return new PixelCanvas(w * ART_TILE, h * ART_TILE + ROOF_ROOM).origin(0, ROOF_ROOM);
}

/** Smoke puffs waiting to be drawn after the outline (smoke has no hard edge). */
let pendingSmoke: [number, number][] = [];

/** Outline everything, then lay a soft shadow under the building's base and add its smoke. */
function finish(c: PixelCanvas, shadow: [number, number, number, number] | null = [17, 29, 15, 3]): PixelCanvas {
  c.outline(OUTLINE);
  if (shadow) c.shadow(...shadow);
  for (const [x, y] of pendingSmoke) {
    for (const [dx, dy, r, alpha] of [[0, 0, 2, 170], [2, -4, 2.5, 130], [1, -8, 2, 90], [3, -11, 1.5, 60]]) {
      c.ellipse(x + dx, y + dy, r, r * 0.85, 0xd8d4ce);
      // ellipse() paints opaque; soften it to the puff's alpha.
      for (let yy = Math.floor(y + dy - r) + c.oy; yy <= Math.ceil(y + dy + r) + c.oy; yy++) {
        for (let xx = Math.floor(x + dx - r) + c.ox; xx <= Math.ceil(x + dx + r) + c.ox; xx++) {
          if (c.inside(xx, yy) && c.get(xx, yy) === 0xd8d4ce) c.data[(yy * c.w + xx) * 4 + 3] = alpha;
        }
      }
    }
  }
  pendingSmoke = [];
  return c;
}

/** Horizontal logs with light tops, dark gaps and round log ends at the corners. */
function logWall(c: PixelCanvas, x: number, y: number, w: number, h: number): void {
  c.rect(x, y, w, h, LOG.mid);
  for (let row = y; row < y + h; row += 3) {
    c.hline(x, x + w - 1, row, LOG.light);
    if (row + 2 < y + h) c.hline(x, x + w - 1, row + 2, LOG.dark);
    c.px(x, row + 1, LOG.end).px(x, row, LOG.endDark);
    c.px(x + w - 1, row + 1, LOG.end).px(x + w - 1, row, LOG.endDark);
  }
}

/** Vertical planks (barns, sheds). */
function plankWall(c: PixelCanvas, x: number, y: number, w: number, h: number): void {
  c.rect(x, y, w, h, PLANK.mid);
  for (let col = x; col < x + w; col += 3) {
    c.vline(col, y, y + h - 1, PLANK.dark);
    c.vline(col + 1, y, y + h - 1, PLANK.light);
  }
}

/** Whitewashed clay over a timber frame. */
function plasterWall(c: PixelCanvas, x: number, y: number, w: number, h: number): void {
  c.rect(x, y, w, h, 0xe6dcc2);
  c.hline(x, x + w - 1, y, LOG.dark).hline(x, x + w - 1, y + h - 1, LOG.dark);
  for (let col = x; col < x + w; col += 7) c.vline(col, y, y + h - 1, LOG.mid);
  c.vline(x + w - 1, y, y + h - 1, LOG.mid);
  for (let i = 0; i < w; i += 5) c.px(x + 2 + i, y + 2 + (i % 3), 0xcfc4a8);
}

/**
 * A pitched roof seen from the front-above: a trapezoid from the eaves
 * (bottom) to the ridge (top). Thatch gets straw streaks, shingles get
 * rows; in winter its top is covered in snow.
 */
function roof(
  c: PixelCanvas,
  x0: number,
  x1: number,
  eaves: number,
  ridge: number,
  inset: number,
  colors: RoofColors,
  kind: 'thatch' | 'shingle',
  winter: boolean,
): void {
  const points = [x0, eaves, x1 + 1, eaves, x1 + 1 - inset, ridge, x0 + inset, ridge];
  c.poly(points, colors.mid);
  const height = eaves - ridge;
  for (let y = ridge; y < eaves; y++) {
    const t = (y - ridge) / height;
    const left = Math.round(x0 + inset * (1 - t));
    const right = Math.round(x1 - inset * (1 - t));
    for (let x = left; x <= right; x++) {
      if (kind === 'thatch') {
        const n = hash(x, Math.floor(y / 2), 31);
        if (n < 0.22) c.px(x, y, colors.dark);
        else if (n > 0.86 || (x - left < 3 && n > 0.5)) c.px(x, y, colors.light);
      } else {
        const row = Math.floor((y - ridge) / 3);
        if ((y - ridge) % 3 === 2) c.px(x, y, colors.dark);
        else if ((x + row * 2) % 5 === 0) c.px(x, y, colors.dark);
        else if ((y - ridge) % 3 === 0 && x - left < (right - left) / 2) c.px(x, y, colors.light);
      }
    }
    // The lit left slope.
    c.px(left, y, colors.light);
  }
  c.hline(x0 + inset, x1 - inset, ridge, colors.light);
  // A dark, ragged eaves line.
  c.hline(x0, x1, eaves - 1, colors.dark);
  if (kind === 'thatch') for (let x = x0; x <= x1; x += 2) c.px(x, eaves, colors.dark);
  if (winter) {
    const snowRows = Math.max(3, Math.round(height * 0.45));
    for (let y = ridge; y < ridge + snowRows; y++) {
      const t = (y - ridge) / height;
      const left = Math.round(x0 + inset * (1 - t));
      const right = Math.round(x1 - inset * (1 - t));
      for (let x = left; x <= right; x++) {
        // A wavy lower edge with drips.
        if (y < ridge + snowRows - 1 || hash(x, y, 32) < 0.6) c.px(x, y, y === ridge + snowRows - 1 ? SNOW_SHADE : SNOW);
      }
    }
  }
}

function door(c: PixelCanvas, x: number, y: number, w: number, h: number): void {
  c.rect(x - 1, y - 1, w + 2, h + 1, LOG.dark);
  c.rect(x, y, w, h, PLANK.mid);
  for (let col = x + 1; col < x + w; col += 2) c.vline(col, y, y + h - 1, PLANK.dark);
  c.px(x + w - 2, y + Math.floor(h / 2), 0xd2a46a);
}

function window_(c: PixelCanvas, x: number, y: number, lit = false): void {
  c.rect(x - 1, y - 1, 5, 4, LOG.dark);
  c.rect(x, y, 3, 2, lit ? 0xffd98a : 0x1e1810);
}

/** Grey puffs rising from a smoke hole (drawn see-through by finish()). */
function smoke(_c: PixelCanvas, x: number, y: number): void {
  pendingSmoke.push([x, y]);
}

function logPile(c: PixelCanvas, x: number, y: number): void {
  for (const [dx, dy] of [[0, 4], [4, 4], [8, 4], [2, 0], [6, 0]]) {
    c.ellipse(x + dx + 2, y + dy + 2, 2.2, 2.2, LOG.endDark);
    c.px(x + dx + 1, y + dy + 1, LOG.end).px(x + dx + 2, y + dy + 2, 0x7a5230);
  }
}

function sack(c: PixelCanvas, x: number, y: number): void {
  c.ellipse(x + 3, y + 4, 3.5, 3.5, 0xc8b28a).ellipse(x + 2, y + 3, 2, 2, 0xe2d0a8);
  c.hline(x + 2, x + 4, y, 0x8a7450);
}

function barrel(c: PixelCanvas, x: number, y: number): void {
  c.rect(x, y, 6, 8, PLANK.mid).vline(x, y, y + 7, PLANK.light).vline(x + 5, y, y + 7, PLANK.dark);
  c.hline(x, x + 5, y + 2, 0x4a4e52).hline(x, x + 5, y + 5, 0x4a4e52);
  c.hline(x + 1, x + 4, y, PLANK.light);
}

function cow(c: PixelCanvas, x: number, y: number): void {
  c.rect(x, y, 10, 5, 0xf4f0e8);
  c.rect(x + 2, y + 1, 3, 2, 0x2a2420).rect(x + 7, y + 2, 2, 2, 0x2a2420);
  c.rect(x + 10, y - 2, 4, 4, 0xf4f0e8).px(x + 13, y - 1, 0x2a2420).px(x + 13, y + 1, 0xe8a0a0);
  c.px(x + 10, y - 3, 0xe8e0c8).px(x + 13, y - 3, 0xe8e0c8);
  for (const lx of [x + 1, x + 3, x + 7, x + 9]) c.vline(lx, y + 5, y + 7, 0xd8d0c0);
  c.px(x - 1, y + 1, 0x2a2420).px(x - 1, y + 2, 0x2a2420);
}

function sheep(c: PixelCanvas, x: number, y: number): void {
  c.ellipse(x + 4, y + 3, 5, 3.5, 0xd8d2c4);
  c.ellipse(x + 3, y + 2, 3.5, 2.5, 0xf4f0e6);
  c.rect(x + 8, y, 3, 3, 0x2a2420).px(x + 9, y, 0x4a4440);
  for (const lx of [x + 1, x + 6]) c.vline(lx, y + 6, y + 7, 0x2a2420);
}

/** The small log hut many workshops share, on the left of their tile. */
function smallHut(c: PixelCanvas, x: number, w: number, winter: boolean, roofColors = THATCH, kind: 'thatch' | 'shingle' = 'thatch'): void {
  logWall(c, x + 2, 17, w - 4, 11);
  roof(c, x, x + w - 1, 18, 4, 4, roofColors, kind, winter);
  door(c, x + Math.floor(w / 2) - 2, 21, 4, 7);
}

type Painter = (winter: boolean) => PixelCanvas;

const PAINTERS: Partial<Record<BuildingType, Painter>> = {
  drwal(winter) {
    const c = sprite();
    smallHut(c, 1, 19, winter);
    // Chopping block with an axe stuck in it.
    c.rect(22, 22, 7, 5, LOG.mid).ellipse(25.5, 22, 3.5, 1.5, LOG.end).px(24, 22, LOG.endDark);
    c.line(25, 21, 29, 15, 0x9a6a3e).rect(23, 19, 3, 3, STONE.light).px(23, 21, STONE.dark);
    logPile(c, 19, 25);
    if (winter) c.hline(21, 27, 25, SNOW);
    return finish(c);
  },
  rybak(winter) {
    const c = sprite();
    smallHut(c, 1, 18, winter);
    // A net drying between two poles, a fish hanging from it.
    c.vline(21, 6, 28, LOG.dark).vline(30, 6, 28, LOG.dark).hline(21, 30, 7, LOG.mid);
    for (let y = 8; y <= 20; y++) for (let x = 22; x <= 29; x++) if ((x + y) % 3 === 0 || (x - y + 30) % 3 === 0) c.px(x, y, 0xbfae80);
    c.rect(24, 21, 2, 5, 0x7fb6dc).px(24, 21, 0x4f86ac).px(25, 26, 0x4f86ac);
    c.ellipse(27, 27, 3, 2, 0xa07a40).hline(25, 29, 26, 0xc89a5a);
    return finish(c);
  },
  glinianka(winter) {
    const c = sprite();
    // A wooden frame over a reddish clay pit.
    c.vline(4, 6, 20, LOG.dark).vline(27, 6, 20, LOG.dark).hline(3, 28, 6, LOG.mid).hline(3, 28, 5, LOG.light);
    c.ellipse(16, 20, 14, 9, 0x6a3020);
    c.ellipse(16, 21, 12, 7, CLAY.mid);
    c.ellipse(13, 19, 6, 3, CLAY.light).ellipse(20, 23, 4, 2, CLAY.dark);
    c.px(10, 22, CLAY.light).px(22, 19, CLAY.light);
    // A basket of clay and a spade.
    c.ellipse(26, 27, 4, 3, 0xa07a40).hline(23, 29, 25, 0xc89a5a).ellipse(26, 25, 2.5, 1.2, CLAY.mid);
    c.line(6, 16, 9, 27, 0x9a6a3e).rect(8, 26, 3, 3, STONE.mid);
    if (winter) c.ellipse(9, 16, 4, 1.5, SNOW).ellipse(22, 17, 3, 1.2, SNOW);
    return finish(c, [16, 28, 15, 3]);
  },
  zarna(winter) {
    const c = sprite();
    // An open shed: four posts under a thatched roof, the quern beneath.
    for (const x of [4, 27]) c.vline(x, 14, 28, LOG.dark).vline(x + 1, 14, 28, LOG.mid);
    roof(c, 1, 30, 15, 0, 5, THATCH, 'thatch', winter);
    c.ellipse(16, 25, 9, 3.5, STONE.dark).ellipse(16, 24, 9, 3, STONE.mid);
    c.ellipse(16, 21, 8, 3, STONE.dark).ellipse(16, 20.5, 8, 2.6, STONE.light);
    c.ellipse(16, 20.5, 1.5, 1, STONE.dark);
    c.vline(21, 15, 20, LOG.light).px(21, 14, LOG.dark);
    sack(c, 24, 21);
    return finish(c);
  },
  studnia(winter) {
    const c = sprite();
    // Well sweep: a long pole on a forked post, a bucket on a rope.
    c.vline(26, 6, 28, LOG.dark).vline(27, 6, 28, LOG.mid).px(25, 6, LOG.dark).px(28, 6, LOG.dark);
    c.line(3, -8, 30, 10, LOG.light).line(3, -7, 30, 11, LOG.dark);
    c.ellipse(29, 11, 2.5, 2, STONE.mid);
    c.vline(5, -6, 11, 0x8a7450);
    c.rect(3, 11, 5, 4, PLANK.mid).hline(3, 7, 12, 0x4a4e52);
    // Log box with dark water.
    logWall(c, 7, 19, 17, 10);
    c.ellipse(15.5, 19, 8.5, 3.5, LOG.light).ellipse(15.5, 19, 7, 2.5, 0x1e3a52).hline(12, 15, 18, 0x4f86ac);
    if (winter) c.hline(8, 22, 16, SNOW).hline(9, 21, 15, SNOW);
    return finish(c);
  },
  obora(winter) {
    const c = sprite();
    plankWall(c, 2, 15, 28, 13);
    roof(c, 0, 31, 16, -4, 5, SHINGLE, 'shingle', winter);
    // Wide double door, one wing open.
    c.rect(11, 18, 10, 10, DOOR).rect(11, 18, 3, 10, PLANK.light).vline(14, 18, 27, PLANK.dark);
    c.rect(14, 22, 6, 6, 0x1a120a).px(16, 25, 0xc9a24a).px(18, 26, 0xc9a24a);
    cow(c, 17, 23);
    return finish(c);
  },
  serowarnia(winter) {
    const c = sprite();
    plasterWall(c, 3, 17, 22, 11);
    roof(c, 1, 27, 18, 3, 4, THATCH, 'thatch', winter);
    door(c, 8, 21, 4, 7);
    window_(c, 18, 21);
    // A shelf of cheese wheels by the wall.
    c.hline(20, 31, 26, PLANK.dark).hline(20, 31, 25, PLANK.light).vline(21, 26, 29, PLANK.dark).vline(30, 26, 29, PLANK.dark);
    for (const x of [23, 28]) c.ellipse(x, 23, 2.6, 2, 0xd88a18).ellipse(x - 0.5, 22.5, 1.8, 1.2, 0xf5c84a);
    c.ellipse(25.5, 28, 2.4, 1.6, 0xd88a18).px(25, 27, 0xf5c84a);
    return finish(c);
  },
  owczarnia(winter) {
    const c = sprite();
    // A low thatched shed at the back, a wattle pen in front with sheep.
    plankWall(c, 4, 9, 24, 7);
    roof(c, 2, 29, 10, -2, 4, THATCH, 'thatch', winter);
    c.rect(1, 16, 30, 11, 0x9a8a5a);
    c.dither(1, 16, 30, 11, 0x8a7a4a);
    sheep(c, 5, 17);
    sheep(c, 16, 19);
    // Woven fence along the front.
    for (let x = 1; x <= 30; x += 4) c.vline(x, 23, 29, LOG.dark);
    for (const y of [24, 26, 28]) for (let x = 1; x <= 30; x++) c.px(x, y + ((x >> 1) % 2), (x >> 1) % 2 ? LOG.light : LOG.mid);
    if (winter) c.hline(1, 30, 22, SNOW);
    return finish(c);
  },
  tkalnia(winter) {
    const c = sprite();
    logWall(c, 2, 17, 16, 11);
    roof(c, 0, 19, 18, 4, 4, SHINGLE, 'shingle', winter);
    door(c, 8, 21, 4, 7);
    // A warp-weighted loom: posts, a beam, coloured threads, stone weights.
    c.vline(20, 6, 29, LOG.dark).vline(30, 6, 29, LOG.dark).hline(19, 31, 7, LOG.light).hline(19, 31, 8, LOG.mid);
    const threads = [0xc0392b, 0xe6dcc2, 0x2e5f9a, 0xe6dcc2, 0xc0392b, 0xe6dcc2, 0x2e5f9a, 0xe6dcc2, 0xc0392b];
    threads.forEach((color, i) => c.vline(21 + i, 9, 22, color));
    for (let y = 11; y < 22; y += 3) c.hline(21, 29, y, 0x7a4a8a);
    for (let x = 21; x <= 29; x += 2) c.px(x, 24, STONE.mid).px(x, 23, 0xbfae80);
    return finish(c);
  },
  plac(winter) {
    const c = sprite();
    // A trodden square ringed with stones, log benches and a fire in the middle.
    c.ellipse(16, 17, 15, 12, winter ? 0xe0e6ea : 0xb08a5a);
    c.ellipse(16, 17, 13, 10, winter ? 0xeef2f5 : 0xc49e6a);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const x = 16 + Math.cos(a) * 14;
      const y = 17 + Math.sin(a) * 11;
      c.ellipse(x, y, 1.6, 1.3, STONE.mid).px(x - 1, y - 1, STONE.light);
    }
    c.rect(7, 7, 18, 3, LOG.mid).hline(7, 24, 7, LOG.light).px(7, 8, LOG.end).px(24, 8, LOG.end);
    c.rect(7, 25, 18, 3, LOG.mid).hline(7, 24, 25, LOG.light).px(7, 26, LOG.end).px(24, 26, LOG.end);
    c.ellipse(16, 18, 4, 2.5, STONE.dark).ellipse(16, 17.5, 2.6, 1.5, 0x3a2a1a);
    c.poly([13, 18, 16, 10, 19, 18], 0xf07a1a).poly([14.5, 18, 16, 13, 17.5, 18], 0xffd23f);
    return finish(c, null);
  },
  kontyna(winter) {
    const c = sprite();
    // Perun's shrine: dark carved hall, a steep roof with a thunderbolt sign.
    logWall(c, 5, 14, 22, 14);
    roof(c, 2, 29, 15, -12, 7, DARK_SHINGLE, 'shingle', winter);
    c.poly([16, -8, 13, -2, 16, -2, 14, 4, 19, -4, 16, -4, 18, -8], 0xf5d342);
    door(c, 13, 19, 6, 9);
    c.hline(12, 19, 17, 0xc0392b).hline(12, 19, 18, 0xc0392b);
    // Carved posts with red bands either side.
    for (const x of [3, 28]) {
      c.vline(x, 12, 28, LOG.light).vline(x + 1, 12, 28, LOG.dark);
      c.hline(x, x + 1, 15, 0xc0392b).hline(x, x + 1, 21, 0xc0392b);
      c.rect(x - 1, 10, 4, 2, LOG.mid);
    }
    return finish(c);
  },
  kamieniarz(winter) {
    const c = sprite();
    smallHut(c, 1, 17, winter);
    // Cut stone blocks stacked up.
    const blocks: [number, number][] = [[18, 23], [24, 23], [21, 18], [27, 18]];
    for (const [x, y] of blocks) {
      c.rect(x, y, 6, 5, STONE.mid).hline(x, x + 5, y, STONE.light).vline(x, y, y + 4, STONE.light);
      c.hline(x, x + 5, y + 4, STONE.dark).vline(x + 5, y, y + 4, STONE.dark);
    }
    c.line(19, 29, 23, 27, LOG.light).rect(23, 26, 2, 2, STONE.dark);
    if (winter) c.hline(21, 31, 17, SNOW);
    return finish(c);
  },
  rudnik(winter) {
    const c = sprite();
    // A lean-to over a heap of rusty bog ore.
    c.vline(3, 6, 28, LOG.dark).vline(4, 6, 28, LOG.mid).vline(19, 11, 28, LOG.dark).vline(20, 11, 28, LOG.mid);
    c.poly([0, 2, 23, 8, 23, 15, 0, 9], THATCH.mid);
    for (let x = 0; x <= 23; x++) {
      const top = 2 + (x * 6) / 23;
      for (let y = Math.ceil(top); y < top + 7; y++) {
        const n = hash(x, y >> 1, 33);
        if (n < 0.25) c.px(x, y, THATCH.dark);
        else if (n > 0.85) c.px(x, y, THATCH.light);
      }
    }
    c.line(0, 2, 23, 8, THATCH.light).line(0, 9, 23, 15, THATCH.dark);
    if (winter) c.poly([0, 2, 23, 8, 23, 11, 0, 5], SNOW);
    for (const [x, y, r] of [[12, 24, 5], [20, 25, 4.5], [16, 21, 4], [25, 22, 3.5]] as const) {
      c.blob(x, y, r, r * 0.8, 0x5a2414, 0x8a4a2a, 0xb87a4a);
    }
    c.ellipse(27, 28, 3, 2, 0xa07a40).hline(24, 30, 27, 0xc89a5a);
    c.line(6, 18, 9, 28, 0x9a6a3e).rect(8, 27, 3, 2, STONE.mid);
    return finish(c);
  },
  dymarka(winter) {
    const c = sprite();
    // A clay bloomery furnace with a glowing mouth, bellows and charcoal.
    c.poly([10, 28, 22, 28, 19, -2, 13, -2], CLAY.mid);
    c.poly([10, 28, 13, 28, 14.5, -2, 13, -2], CLAY.light);
    c.poly([19, 28, 22, 28, 19, -2, 18, -2], CLAY.dark);
    for (const y of [6, 14, 22]) c.hline(11, 21, y, CLAY.dark);
    c.ellipse(16, -2, 3, 1.2, 0x2a1a12);
    c.ellipse(16, 24, 3, 3, 0x3a1a0e).ellipse(16, 25, 2, 2, 0xf07a1a).px(16, 25, 0xffd23f);
    smoke(c, 16, -5);
    c.poly([2, 22, 9, 24, 2, 26], 0x6b4a2e).line(2, 22, 2, 26, LOG.dark).line(9, 24, 11, 24, LOG.dark);
    for (const [x, y] of [[24, 26], [27, 27], [26, 24], [29, 25]]) c.ellipse(x, y, 2, 1.6, 0x1e1a18).px(x - 1, y - 1, 0x4a4440);
    if (winter) c.ellipse(16, -1, 3, 1, SNOW);
    return finish(c);
  },
  kuznia(winter) {
    const c = sprite();
    // An open smithy: stone hearth with coals, an anvil, a dark roof and chimney.
    for (const x of [2, 28]) c.vline(x, 14, 28, LOG.dark).vline(x + 1, 14, 28, LOG.mid);
    c.rect(4, 16, 24, 12, 0x2a2018);
    roof(c, 0, 31, 16, 0, 5, DARK_SHINGLE, 'shingle', winter);
    c.rect(22, -6, 5, 10, STONE.mid).vline(22, -6, 3, STONE.light).vline(26, -6, 3, STONE.dark);
    smoke(c, 24, -9);
    c.rect(5, 20, 9, 8, STONE.mid).hline(5, 13, 20, STONE.light);
    c.rect(6, 19, 7, 2, 0xf07a1a).px(8, 19, 0xffd23f).px(11, 19, 0xffd23f);
    // The anvil.
    c.rect(17, 21, 9, 3, 0x3a3f46).hline(17, 25, 21, 0x6a727c).rect(20, 24, 3, 4, 0x3a3f46).rect(18, 27, 7, 1, 0x3a3f46);
    c.px(16, 22, 0x3a3f46);
    return finish(c);
  },
};

/** A pixel-art sprite for a workshop or service building, or null if it has none (fields, kopiec). */
export function paintBuilding(type: BuildingType, winter: boolean): PixelCanvas | null {
  return PAINTERS[type]?.(winter) ?? null;
}

/** A house by tier: ziemianka, chata, zagroda, dwór. */
export function paintHouse(tier: number, winter: boolean): PixelCanvas {
  const c = sprite();
  if (tier <= 0) {
    // A pit-house: a turf mound with a log-framed door and a smoke hole.
    c.ellipse(16, 26, 15, 14, TURF.dark);
    c.ellipse(15, 24, 13, 12, TURF.mid);
    c.ellipse(11, 19, 6, 4, TURF.light);
    for (let i = 0; i < 18; i++) c.px(4 + Math.floor(hash(i, 1, 40) * 24), 14 + Math.floor(hash(i, 2, 40) * 12), i % 2 ? TURF.light : TURF.dark);
    c.clear(0, 29, 32, 3);
    if (winter) {
      c.ellipse(15, 18, 12, 6, SNOW).ellipse(12, 16, 6, 3, 0xffffff);
    }
    c.rect(12, 21, 8, 9, LOG.dark).rect(13, 22, 6, 8, 0x1a120a).hline(12, 19, 21, LOG.light);
    c.hline(13, 18, 29, PLANK.mid);
    c.ellipse(20, 12, 1.5, 1, 0x1a120a);
    smoke(c, 20, 9);
    return finish(c, [17, 29, 15, 3]);
  }
  if (tier === 1) {
    logWall(c, 4, 17, 24, 11);
    roof(c, 1, 30, 18, 2, 5, THATCH, 'thatch', winter);
    door(c, 9, 21, 5, 7);
    window_(c, 20, 21);
    smoke(c, 22, -1);
    return finish(c);
  }
  if (tier === 2) {
    // Zagroda: a bigger house with a wooden roof, a shed and its own fence.
    logWall(c, 3, 15, 20, 12);
    roof(c, 0, 25, 16, -2, 5, SHINGLE, 'shingle', winter);
    door(c, 7, 20, 5, 7);
    window_(c, 16, 20, true);
    plankWall(c, 24, 18, 7, 9);
    roof(c, 22, 31, 19, 12, 2, THATCH, 'thatch', winter);
    for (let x = 0; x <= 31; x += 3) c.vline(x, 26, 30, LOG.dark);
    c.hline(0, 31, 27, LOG.light).hline(0, 31, 29, LOG.mid);
    // A gap in the fence in front of the door.
    c.clear(7, 26, 5, 5);
    return finish(c);
  }
  // Dwór: two storeys of logs, a steep roof with a lit gable window,
  // carved horse heads on the ridge and a porch.
  logWall(c, 2, 9, 28, 19);
  roof(c, 0, 31, 10, -13, 7, SHINGLE, 'shingle', winter);
  c.rect(13, -6, 6, 6, LOG.dark).rect(14, -5, 4, 4, 0xffd98a).vline(16, -5, -2, LOG.dark);
  for (const [x, dir] of [[7, -1], [24, 1]] as const) {
    c.px(x, -14, LOG.mid).px(x + dir, -15, LOG.mid).px(x + dir * 2, -15, LOG.mid).px(x + dir * 2, -14, LOG.dark);
  }
  window_(c, 6, 13, true);
  window_(c, 23, 13, true);
  // Porch: a little roof on two posts over the door.
  door(c, 13, 20, 6, 8);
  c.vline(10, 18, 28, LOG.light).vline(21, 18, 28, LOG.light);
  c.rect(9, 16, 14, 2, SHINGLE.mid).hline(9, 22, 16, SHINGLE.light);
  if (winter) c.hline(9, 22, 15, SNOW);
  window_(c, 5, 21);
  window_(c, 24, 21);
  return finish(c);
}

/** The warehouse (magazyn): a long log storehouse on stilts with barrels and sacks. */
export function paintWarehouse(winter: boolean): PixelCanvas {
  const c = sprite();
  for (const x of [4, 12, 20, 27]) c.rect(x, 22, 2, 6, LOG.dark);
  logWall(c, 2, 10, 28, 12);
  roof(c, 0, 31, 11, -8, 5, THATCH, 'thatch', winter);
  c.rect(12, 13, 8, 9, DOOR).rect(13, 14, 6, 8, 0x1a120a);
  c.ellipse(15, 19, 2, 1.5, 0xc8b28a);
  // Steps up to the door.
  c.rect(13, 22, 6, 2, PLANK.light).rect(12, 24, 8, 2, PLANK.mid);
  barrel(c, 2, 22);
  sack(c, 23, 23);
  sack(c, 26, 21);
  return finish(c);
}

/** A construction site: a timber frame whose log walls rise with the work (step 0–8). */
export function paintSite(step: number): PixelCanvas {
  const c = sprite();
  c.ellipse(16, 22, 15, 8, DIRT).dither(3, 16, 26, 12, 0x9b7a4a);
  c.clear(0, 30, 32, 2);
  const wallH = Math.round((step / 8) * 12);
  if (wallH > 0) logWall(c, 5, 28 - wallH, 22, wallH);
  // Frame: corner posts and a top beam.
  for (const x of [5, 26]) c.vline(x, 12, 28, LOG.light);
  c.hline(5, 26, 12, LOG.light).line(5, 12, 16, 3, LOG.mid).line(26, 12, 16, 3, LOG.mid);
  // A ladder and a little stack of logs.
  c.vline(28, 10, 28, PLANK.light).vline(31, 10, 28, PLANK.light);
  for (let y = 12; y < 28; y += 3) c.hline(28, 31, y, PLANK.mid);
  logPile(c, 0, 24);
  return finish(c, null);
}

/** Zgliszcza: ash, charred posts and beams, a few embers. */
export function paintRuins(): PixelCanvas {
  const c = sprite();
  c.ellipse(16, 22, 15, 8, 0x3a3330).dither(3, 17, 26, 11, 0x4a4240);
  c.vline(6, 10, 27, 0x1a1412).vline(7, 12, 27, 0x2a2220).vline(25, 14, 27, 0x1a1412);
  c.line(4, 26, 28, 16, 0x1a1412).line(5, 27, 29, 17, 0x2a2220);
  c.line(8, 18, 24, 27, 0x1a1412);
  for (const [x, y] of [[11, 24], [19, 21], [15, 26], [23, 25]]) c.px(x, y, 0xd9531e).px(x + 1, y, 0xffa23f);
  return finish(c, null);
}

const STUBBLE = 0x9a8350;

/**
 * One field plot (a single tile of the pole): furrows, sprouts, stalks,
 * ripe millet (`ripeRows` of 4 rows still standing) or stubble with
 * sheaves. In winter it lies under snow, with furrows and whatever
 * still stands poking through.
 */
export function paintPlot(stage: PlotStage, ripeRows: number, winter = false): PixelCanvas {
  const c = new PixelCanvas(ART_TILE, ART_TILE);
  const soil = stage === 'dojrzale' || stage === 'sciete' ? 0x8a6a3a : 0x7a5530;
  if (winter) {
    c.rect(1, 1, 30, 30, SNOW);
    for (let y = 3; y < 30; y += 4) {
      // Furrows show as soft blue shadows with a little earth peeking out.
      c.hline(2, 29, y, SNOW_SHADE);
      for (let x = 2; x <= 29; x++) if (hash(x, y, 80) < 0.12) c.px(x, y, soil);
    }
  } else {
    c.rect(1, 1, 30, 30, soil);
    for (let y = 3; y < 30; y += 4) {
      c.hline(2, 29, y, stage === 'zaorane' || stage === 'kielki' ? 0x5e3f22 : mixSoil(soil));
      c.hline(2, 29, y + 1, 0x9a7044);
    }
  }
  for (let row = 0; row < 4; row++) {
    const y = 5 + row * 7;
    for (let col = 0; col < 5; col++) {
      const x = 4 + col * 6 + (row % 2) * 2;
      if (stage === 'kielki') {
        // Sprouts are buried in winter.
        if (!winter) c.px(x, y, 0x7fc04a).px(x - 1, y - 1, 0x9fe06a).px(x + 1, y - 1, 0x7fc04a);
      } else if (stage === 'lodygi') {
        if (winter) c.vline(x, y - 2, y, 0x6a7a4a).px(x, y - 3, SNOW);
        else c.vline(x, y - 4, y, 0x4f8f2a).px(x - 1, y - 3, 0x6faf3a).px(x + 1, y - 2, 0x6faf3a);
      } else if (stage === 'dojrzale') {
        if (row >= 4 - ripeRows) {
          c.vline(x, y - 3, y, 0x8a8a2a).rect(x - 1, y - 6, 3, 3, 0xe0b84a).px(x - 1, y - 6, 0xf5d87a).px(x + 1, y - 4, 0xb8892a);
          if (winter) c.hline(x - 1, x + 1, y - 7, SNOW);
        } else if (!winter) {
          c.px(x, y, STUBBLE).px(x + 1, y, STUBBLE);
        }
      } else if (stage === 'sciete') {
        if (winter) {
          if (hash(x, y, 81) < 0.4) c.px(x, y, STUBBLE);
        } else {
          c.px(x, y, STUBBLE).px(x + 1, y, STUBBLE);
        }
      }
    }
  }
  if (stage === 'sciete') {
    // Two sheaves left standing (with snow caps in winter).
    for (const [x, y] of [[9, 14], [21, 22]]) {
      c.poly([x - 3, y + 5, x, y - 3, x + 3, y + 5], 0xe0b84a).hline(x - 2, x + 2, y + 1, 0x8a6a2a).px(x, y - 3, 0xf5d87a);
      if (winter) c.hline(x - 1, x + 1, y - 2, SNOW).px(x, y - 3, SNOW);
    }
  }
  // A low wattle edge around each plot.
  c.hline(0, 31, 0, LOG.mid).hline(0, 31, 31, LOG.dark).vline(0, 0, 31, LOG.mid).vline(31, 0, 31, LOG.dark);
  if (winter) c.hline(0, 31, 0, SNOW).px(0, 1, SNOW).px(31, 1, SNOW);
  return c;
}

/** A snow drift on a road tile: a lumpy white heap with blue shade and a sparkle. */
export function paintDrift(variant: number): PixelCanvas {
  const c = new PixelCanvas(ART_TILE, ART_TILE);
  const flip = variant % 2 === 0 ? 1 : -1;
  const lumps: [number, number, number, number][] = [
    [16, 20, 14, 8],
    [16 - 6 * flip, 15, 8, 6],
    [16 + 7 * flip, 17, 6, 5],
  ];
  for (const [x, y, rx, ry] of lumps) c.ellipse(x, y + 1, rx, ry, SNOW_SHADE);
  for (const [x, y, rx, ry] of lumps) c.ellipse(x - 1, y - 1, rx - 1, ry - 1, SNOW);
  c.ellipse(16 - 6 * flip - 2, 12, 3, 1.5, 0xffffff);
  c.px(16 + 7 * flip, 14, 0xffffff).px(22, 21, 0xdbe6ee);
  c.outline(0x8fa6b8);
  c.shadow(17, 26, 13, 3, 50);
  return c;
}

/**
 * Pixel flames over a burning house: three tongues, smaller with every
 * bucket poured (`strength` 1–3), flickering between two frames.
 */
export function paintFlames(strength: number, frame: number): PixelCanvas {
  const c = new PixelCanvas(ART_TILE, ART_TILE + ROOF_ROOM).origin(0, ROOF_ROOM);
  const scale = 0.45 + strength * 0.2;
  const tongues: [number, number][] = [
    [8, 0.75],
    [16, 1.1],
    [24, 0.85],
  ];
  tongues.forEach(([x, h], i) => {
    const height = 30 * h * scale * ((i + frame) % 2 === 0 ? 1 : 0.85);
    const base = 26;
    const sway = (i + frame) % 2 === 0 ? 1 : -1;
    c.poly([x - 6, base, x + sway, base - height, x + 6, base], 0xd2321e);
    c.poly([x - 4, base, x + sway, base - height * 0.8, x + 4, base], 0xf07a1a);
    c.poly([x - 2, base, x, base - height * 0.45, x + 2, base], 0xffd23f);
  });
  c.outline(0x5a1a12);
  // Sparks.
  for (let i = 0; i < 4; i++) c.px(4 + hash(i, frame, 82) * 24, 2 - hash(i, frame, 83) * 12, i % 2 ? 0xffd23f : 0xf07a1a);
  return c;
}

function mixSoil(soil: number): number {
  return soil === 0x8a6a3a ? 0x6e5430 : 0x5e3f22;
}

/**
 * The kopiec: marked-out ground with corner stakes, earth layers heaped
 * smaller and higher as material arrives; grassed with a pennant post when done.
 */
export function paintMound(layers: number, totalLayers: number, done: boolean, winter: boolean): PixelCanvas {
  const size = ART_TILE * 3;
  const c = new PixelCanvas(size, size + 24).origin(0, 24);
  const cx = size / 2;
  const cy = size / 2 + 3;
  c.ellipse(cx, cy, size * 0.46, size * 0.4, winter ? 0xd8e0e6 : 0x9b7a4a);
  c.dither(cx - size * 0.3, cy - size * 0.3, size * 0.6, size * 0.6, winter ? 0xc8d4dc : 0x8a6a42);
  for (const [sx, sy] of [[0.08, 0.1], [0.92, 0.1], [0.08, 0.9], [0.92, 0.9]]) {
    c.rect(size * sx - 1, size * sy - 4, 3, 7, LOG.mid).px(size * sx - 1, size * sy - 4, LOG.light);
  }
  const earth: RoofColors[] = [
    { dark: 0x6a4a2a, mid: 0x9b7a4a, light: 0xb89660 },
    { dark: 0x7a5530, mid: 0xb08a52, light: 0xcaa66c },
  ];
  const grass: RoofColors = winter
    ? { dark: 0xb8c8d4, mid: 0xe6edf2, light: 0xffffff }
    : { dark: 0x3f7a2a, mid: 0x5f9a3a, light: 0x86c050 };
  for (let layer = 0; layer < layers; layer++) {
    const t = layer / totalLayers;
    const rx = size * 0.42 * (1 - t * 0.75);
    const ry = size * 0.34 * (1 - t * 0.75);
    const lift = layer * 7;
    const colors = done ? grass : earth[layer % 2];
    // Each layer is a terrace: a dark side band under a lit top.
    c.ellipse(cx, cy - lift + 3, rx, ry, colors.dark);
    c.ellipse(cx - 1, cy - lift, rx - 1, ry - 1, colors.mid);
    c.ellipse(cx - rx * 0.35, cy - lift - ry * 0.35, rx * 0.3, ry * 0.25, colors.light);
  }
  if (done) {
    const top = cy - (totalLayers - 1) * 7;
    c.rect(cx - 1, top - 27, 3, 27, LOG.mid).vline(cx - 1, top - 27, top, LOG.light);
    c.poly([cx + 2, top - 27, cx + 17, top - 23, cx + 2, top - 18], 0xd2321e).line(cx + 2, top - 26, cx + 12, top - 24, 0xf05a3e);
    if (!winter) for (let i = 0; i < 10; i++) c.px(cx - 20 + hash(i, 3, 50) * 40, cy - 6 + hash(i, 4, 50) * 16, i % 2 ? 0xf5d342 : 0xf7f4e8);
  }
  c.outline(OUTLINE);
  return c;
}
