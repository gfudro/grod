import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import { RESOURCE_COLOR } from '../data/resources';
import type { Vec2 } from '../data/types';
import type { VillagerState } from '../sim/state';

const BODY_COLOR = 0xd9a441;
const SAD_BODY_COLOR = 0xd2321e;
const FISH_COLOR = 0x7fb6dc;
const WAITING_ICON_COLOR = 0xcc4433;
const BOUNCE_HEIGHT = 5;
const BUCKET_COLOR = 0x4f9fd8;

export interface VillagerSprite {
  container: Container;
  /** `hunger`: 0 fed, 1 hungry (fish over the head), 2+ sad and red (data/hunger.ts). */
  update(villager: VillagerState, tickAlpha: number, ticksPerTile: number, hunger?: number): void;
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

  /** `ticksPerTile`: how long one step takes right now (longer in winter snow). */
  function update(villager: VillagerState, tickAlpha: number, ticksPerTile: number, hunger = 0): void {
    // Sitting at home on strike: they are inside (the house shows how many).
    container.visible = !(villager.job.kind === 'strike' && villager.motion !== 'walking');
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
  }

  return { container, update };
}
