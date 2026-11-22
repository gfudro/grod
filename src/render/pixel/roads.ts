import { ART_TILE, hash, PixelCanvas } from './canvas';

/** Neighbour bits for a road tile's connections. */
export const ROAD_N = 1;
export const ROAD_E = 2;
export const ROAD_S = 4;
export const ROAD_W = 8;

const HALF = 9; // half the path's width, in art pixels

/**
 * One tile of trodden dirt path, joined towards the neighbouring road
 * tiles in `mask`: a rounded centre, arms to the connected edges, a dark
 * rim, wheel-less footpath ruts and a few pebbles. Snowy in winter.
 */
export function paintRoad(mask: number, winter: boolean): PixelCanvas {
  const c = new PixelCanvas(ART_TILE, ART_TILE);
  // Winter: trodden, slightly muddy snow, so the paths still read on the white map.
  const base = winter ? 0xc9bba4 : 0xb8925a;
  const light = winter ? 0xe8e2d6 : 0xcfa86c;
  const dark = winter ? 0x9a8a70 : 0x8f6c3e;
  const rut = winter ? 0x9c8a6c : 0x9c7846;
  const mid = ART_TILE / 2;
  const lo = mid - HALF;
  const hi = mid + HALF;

  c.ellipse(mid, mid, HALF + 0.5, HALF + 0.5, base);
  if (mask & ROAD_N) c.rect(lo, 0, HALF * 2, mid, base);
  if (mask & ROAD_S) c.rect(lo, mid, HALF * 2, ART_TILE - mid, base);
  if (mask & ROAD_W) c.rect(0, lo, mid, HALF * 2, base);
  if (mask & ROAD_E) c.rect(mid, lo, ART_TILE - mid, HALF * 2, base);

  // Dark, slightly ragged rim where the path meets the grass (not at the joins).
  const isRoad = (x: number, y: number): boolean => {
    if (x < 0) return (mask & ROAD_W) !== 0 && y >= lo && y < hi;
    if (x >= ART_TILE) return (mask & ROAD_E) !== 0 && y >= lo && y < hi;
    if (y < 0) return (mask & ROAD_N) !== 0 && x >= lo && x < hi;
    if (y >= ART_TILE) return (mask & ROAD_S) !== 0 && x >= lo && x < hi;
    return c.get(x, y) >= 0;
  };
  const rim: number[] = [];
  for (let y = 0; y < ART_TILE; y++) {
    for (let x = 0; x < ART_TILE; x++) {
      if (c.get(x, y) < 0) continue;
      if (!isRoad(x - 1, y) || !isRoad(x + 1, y) || !isRoad(x, y - 1) || !isRoad(x, y + 1)) rim.push(x, y);
    }
  }
  for (let i = 0; i < rim.length; i += 2) {
    const x = rim[i];
    const y = rim[i + 1];
    if (hash(x, y, 70) < 0.25) c.clear(x, y, 1, 1);
    else c.px(x, y, dark);
  }

  // Two worn ruts along each arm, light speckles and pebbles.
  const ruts = (horizontal: boolean, from: number, to: number): void => {
    for (let t = from; t < to; t++) {
      for (const off of [-4, 4]) {
        if (hash(t, off, 71) < 0.8) {
          if (horizontal) c.px(t, mid + off, rut);
          else c.px(mid + off, t, rut);
        }
      }
    }
  };
  if (mask & ROAD_N) ruts(false, 0, mid);
  if (mask & ROAD_S) ruts(false, mid, ART_TILE);
  if (mask & ROAD_W) ruts(true, 0, mid);
  if (mask & ROAD_E) ruts(true, mid, ART_TILE);
  for (let y = 0; y < ART_TILE; y++) {
    for (let x = 0; x < ART_TILE; x++) {
      if (c.get(x, y) !== base) continue;
      const n = hash(x, y, 72 + mask);
      if (n < 0.06) c.px(x, y, light);
      else if (n < 0.08 && !winter) c.px(x, y, 0x8c8478).px(x + 1, y, 0xb0a898);
    }
  }
  return c;
}
