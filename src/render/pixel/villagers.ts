import type { ResourceType } from '../../data/resources';
import { hash, PixelCanvas } from './canvas';

/** What a villager holds, picked from their job (see render/villager.ts). */
export type VillagerTool = 'none' | 'axe' | 'net' | 'spade' | 'sickle' | 'mallet' | 'hammer' | 'pick' | 'bucket' | 'pail' | 'bundle';

const OUTLINE = 0x24180e;
const SKIN = 0xf0c8a0;
const SKIN_SHADE = 0xd49e78;
const TUNICS = [0xe0d6b4, 0x8a5a3a, 0x5a7a9a, 0x7a8a4a, 0xa84a3a, 0xc89a4a];
const HAIR = [0x5a3a1f, 0xd8b060, 0x2a1e14, 0x9a5a2a];
const WOOD = 0x9a6a3e;
const IRON = 0x8a9198;

/** The art frame of a villager: 16×22, standing on the bottom row, facing right. */
export const VILLAGER_W = 16;
export const VILLAGER_H = 22;

function shade(color: number): number {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return (Math.round(r * 0.72) << 16) | (Math.round(g * 0.72) << 8) | Math.round(b * 0.72);
}

/**
 * A little Slav in a linen tunic, belt and leg wraps, facing right,
 * holding the tool of their trade. `variant` picks tunic, hair and
 * headscarf; `sad` gives the frown of the second stage of hunger.
 */
export function paintVillager(variant: number, tool: VillagerTool, sad: boolean): PixelCanvas {
  const c = new PixelCanvas(VILLAGER_W, VILLAGER_H);
  const tunic = TUNICS[Math.floor(hash(variant, 1, 60) * TUNICS.length)];
  const hair = HAIR[Math.floor(hash(variant, 2, 60) * HAIR.length)];
  const scarf = hash(variant, 3, 60) < 0.35;

  // The bundle hangs on the back, behind the body.
  if (tool === 'bundle') {
    c.ellipse(4, 10, 3.5, 4, 0x8a5a2b).px(3, 8, 0xa87a4b).px(4, 7, 0xa87a4b).line(5, 7, 9, 9, 0x5a3a1f);
  }
  // Legs with linen wraps and leather shoes.
  c.rect(6, 16, 2, 4, 0xd8c8a0).rect(9, 16, 2, 4, 0xc8b890);
  c.px(6, 17, 0x8a7450).px(7, 18, 0x8a7450).px(9, 17, 0x8a7450).px(10, 18, 0x8a7450);
  c.rect(6, 20, 3, 1, 0x4a2f18).rect(9, 20, 3, 1, 0x4a2f18);
  // Tunic, flared at the hem, with a belt.
  c.poly([5, 8, 12, 8, 13, 16, 4, 16], tunic);
  c.vline(5, 9, 15, shade(tunic)).hline(5, 12, 15, shade(tunic));
  c.px(6, 9, mixLight(tunic)).px(7, 9, mixLight(tunic));
  c.hline(5, 12, 12, 0x5a3a1f).px(9, 12, 0xd2a46a);
  // Head.
  c.rect(6, 2, 6, 6, SKIN).vline(6, 3, 7, SKIN_SHADE).hline(7, 11, 7, SKIN_SHADE);
  if (scarf) {
    c.rect(5, 1, 7, 3, 0xf2ece0).rect(5, 1, 2, 7, 0xf2ece0).px(4, 7, 0xf2ece0).hline(6, 11, 1, 0xd8d0c0);
  } else {
    c.rect(6, 1, 6, 2, hair).rect(5, 2, 2, 4, hair).px(11, 2, hair);
  }
  // Face: an eye, rosy cheek, a smile or a frown.
  c.px(10, 4, 0x2a1a10).px(11, 5, 0xe8a088);
  if (sad) c.px(9, 7, 0x2a1a10).px(10, 6, 0x2a1a10).px(11, 7, 0x2a1a10).px(10, 5, 0x4f86ac);
  else c.px(10, 6, 0xb86a58);

  paintTool(c, tool);
  // The front arm and hand, over the tool's handle.
  c.rect(10, 9, 2, 4, shade(tunic)).px(11, 13, SKIN).px(12, 13, SKIN);
  return c.outline(OUTLINE);
}

function mixLight(color: number): number {
  const r = Math.min(255, ((color >> 16) & 255) + 40);
  const g = Math.min(255, ((color >> 8) & 255) + 40);
  const b = Math.min(255, (color & 255) + 40);
  return (r << 16) | (g << 8) | b;
}

function paintTool(c: PixelCanvas, tool: VillagerTool): void {
  switch (tool) {
    case 'axe':
      c.line(12, 14, 14, 6, WOOD).rect(13, 4, 3, 3, IRON).px(15, 7, IRON).px(13, 4, 0xc8d0d8);
      break;
    case 'net':
      // A net over the shoulder.
      for (let y = 3; y < 12; y++) for (let x = 1; x < 6; x++) if ((x + y) % 2 === 0) c.px(x, y, 0xbfae80);
      c.line(5, 3, 11, 9, WOOD);
      break;
    case 'spade':
      c.vline(13, 5, 14, WOOD).rect(12, 15, 3, 4, IRON).px(12, 15, 0xc8d0d8).hline(12, 14, 4, WOOD);
      break;
    case 'sickle':
      c.vline(12, 11, 14, WOOD).line(12, 10, 13, 7, IRON).line(13, 7, 15, 6, IRON).px(15, 7, IRON).px(15, 8, 0xc8d0d8);
      break;
    case 'mallet':
      c.line(12, 14, 13, 7, WOOD).rect(11, 4, 5, 3, 0xa8743e).hline(11, 15, 4, 0xc8945a);
      break;
    case 'hammer':
      c.line(12, 14, 13, 8, WOOD).rect(11, 6, 5, 2, 0x4a5058).px(11, 6, 0x8a9198);
      break;
    case 'pick':
      c.line(12, 14, 13, 6, WOOD).line(10, 6, 13, 5, IRON).line(13, 5, 15, 7, IRON);
      break;
    case 'bucket':
      // A full bucket of water for the fire.
      c.rect(12, 14, 4, 4, 0x86592f).hline(12, 15, 14, 0x4f9fd8).hline(12, 15, 16, 0x4a4e52).line(12, 13, 15, 13, IRON);
      break;
    case 'pail':
      c.rect(12, 14, 4, 4, 0x86592f).hline(12, 15, 14, 0xf4f4f0).hline(12, 15, 16, 0x4a4e52);
      break;
    case 'bundle':
    case 'none':
      break;
  }
}

/** Small (12×12) pictures of the goods: carried in hands, shown in bubbles. */
export function paintResource(resource: ResourceType | 'woda'): PixelCanvas {
  const c = new PixelCanvas(12, 12);
  switch (resource) {
    case 'drewno':
      for (const [x, y] of [[1, 6], [5, 6], [3, 2]]) {
        c.rect(x, y + 1, 6, 3, 0x7a5230).hline(x, x + 5, y + 1, 0x9a6a3e);
        c.ellipse(x + 6, y + 2.5, 1.5, 1.6, 0xd2a46a).px(x + 6, y + 2, 0x9a7040);
      }
      c.vline(6, 3, 10, 0xc8b28a);
      break;
    case 'glina':
      c.ellipse(6, 8, 5, 3.5, 0xa07a40).hline(1, 10, 6, 0xc89a5a);
      c.blob(6, 5, 4, 3, 0x8a3e2a, 0xb5594a, 0xd88a62);
      break;
    case 'ryba':
      c.ellipse(5, 6, 4.5, 2.6, 0x7fb6dc).poly([8, 6, 11, 3, 11, 9], 0x5f96bc);
      c.hline(2, 7, 7, 0x4f86ac).px(2, 5, 0x1e2a3a).hline(3, 6, 5, 0xbfe0f0);
      break;
    case 'proso':
      c.poly([3, 11, 6, 2, 9, 11], 0xe0b84a).hline(3, 9, 7, 0x8a6a2a);
      c.px(5, 3, 0xf5d87a).px(4, 5, 0xf5d87a).px(7, 4, 0xb8892a).px(8, 9, 0xb8892a);
      break;
    case 'kasza':
      c.ellipse(6, 7, 5, 4, 0xa0503a).ellipse(5, 6, 3, 2, 0xc06a4a);
      c.ellipse(6, 4, 4.5, 1.8, 0xf0e2b6).px(4, 3, 0xffffff).px(7, 4, 0xd8c890);
      break;
    case 'mleko':
      c.poly([3, 11, 2, 5, 4, 2, 8, 2, 10, 5, 9, 11], 0xc06a4a).rect(4, 2, 4, 2, 0xf8f6f0).px(4, 6, 0xd88a62);
      c.vline(10, 5, 8, 0x8a3e2a);
      break;
    case 'ser':
      c.ellipse(6, 7, 5, 3.5, 0xd88a18).ellipse(6, 6, 4.5, 2.6, 0xf5c84a).px(4, 5, 0xffe08a).px(8, 7, 0xd8a028);
      break;
    case 'welna':
      c.blob(6, 6, 5, 4.5, 0xb8ae9a, 0xd8d0be, 0xf4f0e6);
      c.line(2, 5, 9, 8, 0xb8ae9a).line(3, 8, 8, 3, 0xb8ae9a);
      break;
    case 'ubrania':
      c.poly([2, 3, 4, 1, 8, 1, 10, 3, 9, 5, 8, 4, 8, 11, 4, 11, 4, 4, 3, 5], 0x9b59b6);
      c.hline(4, 7, 7, 0x5a3a1f).vline(4, 4, 10, 0x7a3a96).px(5, 2, 0xc08ad8);
      break;
    case 'kamien':
      c.rect(1, 4, 10, 6, 0x8c9196).hline(1, 10, 4, 0xb8bdc2).vline(1, 4, 9, 0xb8bdc2).hline(1, 10, 9, 0x5d6267).vline(10, 4, 9, 0x5d6267);
      break;
    case 'ruda':
      c.blob(4, 7, 3.5, 3, 0x5a2414, 0x8a4a2a, 0xb87a4a).blob(8, 6, 3, 3, 0x5a2414, 0x7a3a1f, 0xa86a3a);
      break;
    case 'zelazo':
      c.poly([1, 8, 3, 4, 11, 4, 9, 8], 0x4a5560).hline(3, 10, 4, 0x8a9aa8).px(4, 5, 0xc8d4e0);
      break;
    case 'lopaty':
      c.vline(6, 1, 6, 0x9a6a3e).hline(5, 7, 1, 0x9a6a3e).rect(4, 7, 5, 4, 0x8a9198).px(4, 7, 0xc8d0d8);
      break;
    case 'woda':
      c.rect(3, 4, 6, 7, 0x86592f).hline(3, 8, 4, 0x4f9fd8).hline(3, 8, 7, 0x4a4e52).line(3, 3, 8, 3, 0x8a9198);
      break;
  }
  return c.outline(OUTLINE);
}

/** A white speech bubble (14×14) with a tail, for "waiting for…" and "hungry". */
export function paintBubble(rim: number): PixelCanvas {
  const c = new PixelCanvas(18, 18);
  c.ellipse(9, 8, 8, 7.5, 0xffffff).poly([6, 13, 9, 17, 11, 13], 0xffffff);
  c.outline(rim);
  return c;
}
