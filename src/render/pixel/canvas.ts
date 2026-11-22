import { CanvasSource, Texture } from 'pixi.js';
import { TILE_SIZE } from '../../data/tiles';

/** Art pixels per map tile; each art pixel is drawn as a 2×2 block on the map. */
export const ART_TILE = 32;
export const ART_SCALE = TILE_SIZE / ART_TILE;

/** Cheap deterministic noise in [0, 1) for texture variation (render only, not sim). */
export function hash(x: number, y: number, seed = 0): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Mixes two 0xRRGGBB colours; t = 0 gives a, t = 1 gives b. */
export function mix(a: number, b: number, t: number): number {
  const r = Math.round(((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t);
  const g = Math.round(((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t);
  const bl = Math.round((a & 255) * (1 - t) + (b & 255) * t);
  return (r << 16) | (g << 8) | bl;
}

/**
 * A small RGBA bitmap drawn pixel by pixel — the "sprite sheet" of the
 * pixel-art look. Everything is drawn at ART_TILE pixels per tile and
 * blown up with nearest-neighbour filtering, so edges stay crisp.
 */
export class PixelCanvas {
  readonly data: Uint8ClampedArray;
  /** Drawing calls are offset by this much (e.g. so a roof can rise above its tile). */
  ox = 0;
  oy = 0;

  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8ClampedArray(w * h * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Sets where (0, 0) of the drawing calls lands on the bitmap. */
  origin(x: number, y: number): this {
    this.ox = x;
    this.oy = y;
    return this;
  }

  px(x: number, y: number, color: number, alpha = 255): this {
    return this.raw(Math.floor(x) + this.ox, Math.floor(y) + this.oy, color, alpha);
  }

  /** Like px, but in bitmap coordinates (ignores the origin). */
  raw(x: number, y: number, color: number, alpha = 255): this {
    if (!this.inside(x, y)) return this;
    const i = (y * this.w + x) * 4;
    if (alpha >= 255 || this.data[i + 3] === 0) {
      this.data[i] = (color >> 16) & 255;
      this.data[i + 1] = (color >> 8) & 255;
      this.data[i + 2] = color & 255;
      this.data[i + 3] = alpha;
      return this;
    }
    const t = alpha / 255;
    this.data[i] = this.data[i] * (1 - t) + ((color >> 16) & 255) * t;
    this.data[i + 1] = this.data[i + 1] * (1 - t) + ((color >> 8) & 255) * t;
    this.data[i + 2] = this.data[i + 2] * (1 - t) + (color & 255) * t;
    return this;
  }

  /** The colour at a pixel, or -1 where it is transparent. */
  get(x: number, y: number): number {
    if (!this.inside(x, y)) return -1;
    const i = (y * this.w + x) * 4;
    if (this.data[i + 3] === 0) return -1;
    return (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2];
  }

  /** Darkens (amount > 0) or lightens (amount < 0) what is already there. */
  shade(x: number, y: number, amount: number): void {
    const c = this.get(x, y);
    if (c < 0) return;
    const i = (y * this.w + x) * 4;
    const alpha = this.data[i + 3];
    this.raw(x, y, amount > 0 ? mix(c, 0x10100c, amount) : mix(c, 0xffffff, -amount));
    this.data[i + 3] = alpha;
  }

  rect(x: number, y: number, w: number, h: number, color: number): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, color);
    return this;
  }

  /** Makes a rectangle fully transparent again (cutting shapes off). */
  clear(x: number, y: number, w: number, h: number): this {
    for (let yy = y + this.oy; yy < y + h + this.oy; yy++) {
      for (let xx = x + this.ox; xx < x + w + this.ox; xx++) {
        if (this.inside(xx, yy)) this.data[(yy * this.w + xx) * 4 + 3] = 0;
      }
    }
    return this;
  }

  /** Checkerboard dither: every other already-drawn pixel of the rectangle. */
  dither(x: number, y: number, w: number, h: number, color: number, phase = 0): this {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        // Only over what is already drawn, so it textures a shape without squaring it off.
        if ((xx + yy + phase) % 2 === 0 && this.get(Math.floor(xx) + this.ox, Math.floor(yy) + this.oy) >= 0) this.px(xx, yy, color);
      }
    return this;
  }

  hline(x0: number, x1: number, y: number, color: number): this {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.px(x, y, color);
    return this;
  }

  vline(x: number, y0: number, y1: number, color: number): this {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.px(x, y, color);
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, color: number): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: number): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, color);
      }
    }
    return this;
  }

  /**
   * A round shape lit from the top-left: dark body, mid tone shifted up-left,
   * a small highlight. The basic pixel-art "blob" for canopies, stones, wool.
   */
  blob(cx: number, cy: number, rx: number, ry: number, dark: number, mid: number, light: number): this {
    this.ellipse(cx, cy, rx, ry, dark);
    this.ellipse(cx - rx * 0.15, cy - ry * 0.18, rx * 0.8, ry * 0.75, mid);
    this.ellipse(cx - rx * 0.38, cy - ry * 0.42, Math.max(1, rx * 0.3), Math.max(1, ry * 0.28), light);
    return this;
  }

  /** Filled polygon, tested at pixel centres. Points as [x0, y0, x1, y1, ...]. */
  poly(points: number[], color: number): this {
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 1; i < points.length; i += 2) {
      minY = Math.min(minY, points[i]);
      maxY = Math.max(maxY, points[i]);
    }
    const n = points.length / 2;
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const cy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < n; i++) {
        const x0 = points[i * 2];
        const y0 = points[i * 2 + 1];
        const x1 = points[((i + 1) % n) * 2];
        const y1 = points[((i + 1) % n) * 2 + 1];
        if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) xs.push(x0 + ((cy - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k] - 0.5); x <= Math.floor(xs[k + 1] - 0.5); x++) this.px(x, y, color);
      }
    }
    return this;
  }

  /** Draws another canvas on top (alpha-blended), e.g. a tree onto the terrain. */
  blit(src: PixelCanvas, dx: number, dy: number): this {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = (y * src.w + x) * 4;
        const a = src.data[i + 3];
        if (a === 0) continue;
        this.raw(dx + x, dy + y, (src.data[i] << 16) | (src.data[i + 1] << 8) | src.data[i + 2], a);
      }
    }
    return this;
  }

  /** A one-pixel dark outline around everything drawn so far — the pixel-art look. */
  outline(color = 0x24180e): this {
    const edge: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y) >= 0) continue;
        if (this.get(x - 1, y) >= 0 || this.get(x + 1, y) >= 0 || this.get(x, y - 1) >= 0 || this.get(x, y + 1) >= 0) {
          edge.push(x, y);
        }
      }
    }
    for (let i = 0; i < edge.length; i += 2) this.raw(edge[i], edge[i + 1], color);
    return this;
  }

  /** A see-through shadow on the ground, only where nothing is drawn yet (call after outline). */
  shadow(cx: number, cy: number, rx: number, ry: number, alpha = 70): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const bx = x + this.ox;
        const by = y + this.oy;
        if (dx * dx + dy * dy <= 1 && this.inside(bx, by) && this.data[(by * this.w + bx) * 4 + 3] === 0) {
          this.raw(bx, by, 0x0c1408, alpha);
        }
      }
    }
    return this;
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.putImageData(new ImageData(new Uint8ClampedArray(this.data), this.w, this.h), 0, 0);
    return canvas;
  }

  /** A crisp (nearest-neighbour) texture; show it with sprite.scale = ART_SCALE. */
  toTexture(): Texture {
    return new Texture({ source: new CanvasSource({ resource: this.toCanvas(), scaleMode: 'nearest' }) });
  }
}

/** Memoises textures by key so each sprite is painted once. */
export function textureCache(): (key: string, paint: () => PixelCanvas) => Texture {
  const cache = new Map<string, Texture>();
  return (key, paint) => {
    let texture = cache.get(key);
    if (!texture) {
      texture = paint().toTexture();
      cache.set(key, texture);
    }
    return texture;
  };
}
