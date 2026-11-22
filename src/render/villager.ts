import { Container, Graphics, Sprite } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import { RESOURCE_COLOR, type ResourceType } from '../data/resources';
import type { BuildingType } from '../data/buildings';
import { isPixelStyle } from './style';
import { ART_SCALE, hash, textureCache } from './pixel/canvas';
import { paintBubble, paintResource, paintVillager, VILLAGER_H, VILLAGER_W, type VillagerTool } from './pixel/villagers';
import type { Vec2 } from '../data/types';
import type { VillagerState } from '../sim/state';

const BODY_COLOR = 0xd9a441;
const SAD_BODY_COLOR = 0xd2321e;
const FISH_COLOR = 0x7fb6dc;
const WAITING_ICON_COLOR = 0xcc4433;
const BOUNCE_HEIGHT = 5;
const BUCKET_COLOR = 0x4f9fd8;

const pixelTexture = textureCache();

/** The tool in a worker's hands, by the building they work for. */
const WORKPLACE_TOOL: Partial<Record<BuildingType, VillagerTool>> = {
  drwal: 'axe',
  rybak: 'net',
  glinianka: 'spade',
  rudnik: 'spade',
  kamieniarz: 'pick',
  pole: 'sickle',
  obora: 'pail',
  kuznia: 'hammer',
  dymarka: 'hammer',
};

/** A stable look (tunic, hair, headscarf) per villager, from their id. */
function idVariant(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.floor(hash(h, 0, 7) * 64);
}

function villagerTool(villager: VillagerState, workplace: BuildingType | null): VillagerTool {
  const job = villager.job;
  switch (job.kind) {
    case 'build':
    case 'upgrade':
    case 'rebuild':
      return 'mallet';
    case 'dig':
      return 'spade';
    case 'douse':
      return job.stage === 'toHouse' ? 'bucket' : 'none';
    case 'arriving':
      return 'bundle';
    case 'produce':
    case 'farm':
    case 'process':
      // Hands full on the way back: the good is carried instead.
      return villager.carrying ? 'none' : ((workplace && WORKPLACE_TOOL[workplace]) ?? 'none');
    default:
      return 'none';
  }
}

export interface VillagerSprite {
  container: Container;
  /**
   * `hunger`: 0 fed, 1 hungry (fish over the head), 2+ sad and red (data/hunger.ts).
   * `workplace`: the type of building they work for, to pick the tool in their hands.
   */
  update(villager: VillagerState, tickAlpha: number, ticksPerTile: number, hunger?: number, workplace?: BuildingType | null): void;
}

function tileTopLeftPixels(tile: Vec2): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE };
}

export function createVillagerSprite(): VillagerSprite {
  const container = new Container();

  const body = new Container();
  // Drawn white and tinted: yellow when fed, red when sad with hunger.
  const bodyShape = new Graphics()
    .circle(0, 0, TILE_SIZE * 0.18)
    .fill(0xffffff)
    .circle(0, 0, TILE_SIZE * 0.18)
    .stroke({ color: 0x5c3a12, width: 2 });
  bodyShape.tint = BODY_COLOR;
  body.addChild(bodyShape);
  // A sad face for the second step of hunger.
  const sadFace = new Graphics()
    .circle(-3.5, -2, 1.6)
    .fill(0x2b0f08)
    .circle(3.5, -2, 1.6)
    .fill(0x2b0f08)
    .arc(0, 6, 4.5, Math.PI * 1.15, Math.PI * 1.85)
    .stroke({ color: 0x2b0f08, width: 1.8 });
  sadFace.visible = false;
  body.addChild(sadFace);
  container.addChild(body);

  // A little fish over a hungry villager's head.
  const fishIcon = new Graphics()
    .ellipse(0, 0, 7, 4)
    .fill(FISH_COLOR)
    .poly([6, 0, 11, -4, 11, 4])
    .fill(FISH_COLOR)
    .ellipse(0, 0, 7, 4)
    .stroke({ color: 0x1f3a52, width: 1.5 });
  fishIcon.position.set(TILE_SIZE * 0.2, -TILE_SIZE * 0.3);
  fishIcon.visible = false;
  container.addChild(fishIcon);

  const carryingIcon = new Graphics()
    .rect(-7, -7, 14, 14)
    .fill(0xffffff)
    .rect(-7, -7, 14, 14)
    .stroke({ color: 0x33281a, width: 2 });
  carryingIcon.position.set(0, -TILE_SIZE * 0.32);
  carryingIcon.visible = false;
  container.addChild(carryingIcon);

  // Drawn white so it can be tinted: red for "no road", or the colour of
  // the missing good (e.g. proso for an idle żarna worker).
  const waitingIcon = new Graphics()
    .circle(0, -TILE_SIZE * 0.4, 9)
    .fill(0xffffff)
    .circle(0, -TILE_SIZE * 0.4, 9)
    .stroke({ color: 0x33281a, width: 2 });
  waitingIcon.visible = false;
  container.addChild(waitingIcon);

  // A settler's "tobołek" — the bundle on their back, visible the whole
  // walk from the map edge, so Artur can see where new people come from.
  const bundle = new Graphics()
    .circle(0, 0, 7)
    .fill(0x8a5a2b)
    .circle(0, 0, 7)
    .stroke({ color: 0x4a2f12, width: 2 });
  bundle.position.set(-TILE_SIZE * 0.14, -2); // slung on the back
  bundle.visible = false;
  body.addChild(bundle);

  // The pixel-art look: a little person with their tool, and small
  // pictures of goods instead of coloured squares and circles.
  const pixelBody = new Sprite();
  pixelBody.scale.set(ART_SCALE);
  // Feet on the tile centre line (a little below it), centred horizontally.
  pixelBody.position.set((-VILLAGER_W / 2) * ART_SCALE, (4 - VILLAGER_H) * ART_SCALE + 6);
  body.addChild(pixelBody);

  const pixelCarry = new Sprite();
  pixelCarry.scale.set(ART_SCALE);
  pixelCarry.position.set(-12, -TILE_SIZE * 0.5 - 6);
  container.addChild(pixelCarry);

  const pixelBubble = new Container();
  const bubbleBack = new Sprite();
  bubbleBack.scale.set(ART_SCALE);
  const bubbleIcon = new Sprite();
  bubbleIcon.scale.set(ART_SCALE * 0.85);
  bubbleIcon.position.set(8, 5);
  pixelBubble.addChild(bubbleBack, bubbleIcon);
  pixelBubble.position.set(-18 + 6, -TILE_SIZE * 0.5 - 30);
  container.addChild(pixelBubble);

  /** Shows the bubble with a picture of `what` (null = the red "no road" sign alone). */
  function showBubble(what: ResourceType | null, rim: number): void {
    pixelBubble.visible = true;
    bubbleBack.texture = pixelTexture(`bubble:${rim}`, () => paintBubble(rim));
    bubbleIcon.visible = what !== null;
    if (what) bubbleIcon.texture = pixelTexture(`res:${what}`, () => paintResource(what));
  }

  /** `ticksPerTile`: how long one step takes right now (longer in winter snow). */
  function update(villager: VillagerState, tickAlpha: number, ticksPerTile: number, hunger = 0, workplace: BuildingType | null = null): void {
    // Sitting at home on strike: they are inside (the house shows how many).
    container.visible = !(villager.job.kind === 'strike' && villager.motion !== 'walking');
    bodyShape.visible = true;
    bodyShape.tint = hunger >= 2 ? SAD_BODY_COLOR : BODY_COLOR;
    sadFace.visible = hunger >= 2;
    const fromPx = tileTopLeftPixels(villager.from);
    const half = TILE_SIZE / 2;

    if (villager.motion === 'walking') {
      const toPx = tileTopLeftPixels(villager.to);
      const progress = Math.min(1, (villager.segmentTicks + tickAlpha) / ticksPerTile);
      container.position.set(
        fromPx.x + half + (toPx.x - fromPx.x) * progress,
        fromPx.y + half + (toPx.y - fromPx.y) * progress,
      );
      body.scale.x = villager.facing;
      body.position.y = -Math.abs(Math.sin(progress * Math.PI * 3)) * BOUNCE_HEIGHT;
      waitingIcon.visible = false;
    } else {
      container.position.set(fromPx.x + half, fromPx.y + half);
      body.position.y = 0;
      waitingIcon.visible = villager.motion === 'waiting';
      waitingIcon.tint = villager.waitingFor ? RESOURCE_COLOR[villager.waitingFor] : WAITING_ICON_COLOR;
    }

    if (villager.job.kind === 'douse' && villager.job.stage === 'toHouse') {
      // A full bucket of water, on the way to the fire.
      carryingIcon.visible = true;
      carryingIcon.tint = BUCKET_COLOR;
    } else if (villager.carrying) {
      carryingIcon.visible = true;
      carryingIcon.tint = RESOURCE_COLOR[villager.carrying];
    } else {
      carryingIcon.visible = false;
    }

    bundle.visible = villager.job.kind === 'arriving';
    // The fish shows what they need, unless their hands or a waiting sign are taken already.
    fishIcon.visible = hunger >= 1 && !carryingIcon.visible && !waitingIcon.visible;

    const pixel = isPixelStyle();
    pixelBody.visible = pixel;
    pixelCarry.visible = false;
    pixelBubble.visible = false;
    if (!pixel) return;

    bodyShape.visible = false;
    sadFace.visible = false;
    bundle.visible = false;
    const sad = hunger >= 2;
    const variant = idVariant(villager.id);
    const tool = villagerTool(villager, workplace);
    pixelBody.texture = pixelTexture(`v:${variant}:${tool}:${sad}`, () => paintVillager(variant, tool, sad));
    pixelBody.tint = sad ? 0xffb0a0 : 0xffffff;

    if (carryingIcon.visible) {
      carryingIcon.visible = false;
      const good: ResourceType | 'woda' = villager.job.kind === 'douse' ? 'woda' : (villager.carrying ?? 'woda');
      if (good !== 'woda' || tool !== 'bucket') {
        pixelCarry.visible = true;
        pixelCarry.texture = pixelTexture(`res:${good}`, () => paintResource(good));
      }
    }
    if (waitingIcon.visible) {
      waitingIcon.visible = false;
      showBubble(villager.waitingFor, villager.waitingFor ? 0x33281a : WAITING_ICON_COLOR);
    } else if (fishIcon.visible) {
      fishIcon.visible = false;
      showBubble('ryba', WAITING_ICON_COLOR);
    }
  }

  return { container, update };
}
