import { Container, Graphics, Sprite } from 'pixi.js';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { TILE_SIZE } from '../data/tiles';
import type { Vec2 } from '../data/types';
import { serviceRangeTiles } from '../sim/houses';
import { BUILDING_COLOR } from './buildings';
import { drawRangeTiles } from './range-highlight';
import { isPixelStyle } from './style';
import { ART_SCALE, textureCache, type PixelCanvas } from './pixel/canvas';
import { paintBuilding, paintHouse, ROOF_ROOM } from './pixel/buildings';

const pixelTexture = textureCache();

/** The pixel sprite a building will look like, for the see-through preview (null: plain shape). */
function ghostPainter(type: BuildingType): (() => PixelCanvas) | null {
  if (type === 'ziemianka') return () => paintHouse(0, false);
  return paintBuilding(type, false) ? () => paintBuilding(type, false)! : null;
}

// A saturated white reads clearly against grass/bank/water alike; the old
// green border was nearly the same colour as the grass tiles it sat on.
const VALID_BORDER = 0xffffff;
const INVALID_BORDER = 0xcc4433;
const GHOST_ALPHA = 0.55;

export interface BuildGhost {
  container: Container;
  /** Pass null to hide the ghost (nothing armed, or pointer left the map). */
  update(type: BuildingType | null, tile: Vec2 | null, valid: boolean): void;
}

export function createBuildGhost(): BuildGhost {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);
  const preview = new Sprite();
  preview.scale.set(ART_SCALE);
  preview.alpha = 0.7;
  container.addChild(preview);
  const border = new Graphics();
  border.alpha = GHOST_ALPHA;
  container.addChild(border);
  graphics.alpha = GHOST_ALPHA;
  container.visible = false;

  function update(type: BuildingType | null, tile: Vec2 | null, valid: boolean): void {
    if (!type || !tile) {
      container.visible = false;
      return;
    }
    container.visible = true;

    const def = BUILDINGS[type];
    const { w, h } = def.footprint ?? { w: 1, h: 1 };
    const inset = TILE_SIZE * 0.1;
    const px = tile.x * TILE_SIZE;
    const py = tile.y * TILE_SIZE;
    const width = w * TILE_SIZE - inset * 2;
    const height = h * TILE_SIZE - inset * 2;
    const color = BUILDING_COLOR[type] ?? 0x555555;

    graphics.clear();
    border.clear();
    // Show a service building's range while placing it, so the player
    // can see which houses it will reach before committing.
    if (def.serviceRange !== undefined) {
      drawRangeTiles(graphics, serviceRangeTiles(tile, def.serviceRange));
    }
    const painter = isPixelStyle() ? ghostPainter(type) : null;
    preview.visible = painter !== null;
    if (painter) {
      preview.texture = pixelTexture(`ghost:${type}`, painter);
      preview.position.set(px, py - ROOF_ROOM * ART_SCALE);
      preview.tint = valid ? 0xffffff : 0xff8070;
    } else {
      graphics.rect(px + inset, py + inset, width, height).fill(color);
    }
    border
      .rect(px + inset, py + inset, width, height)
      .stroke({ color: valid ? VALID_BORDER : INVALID_BORDER, width: 4 });
  }

  return { container, update };
}
