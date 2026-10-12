import { Container, Graphics } from 'pixi.js';
import { TILE_SIZE } from '../data/tiles';
import { RESOURCE_COLOR } from '../data/resources';
import type { Vec2 } from '../data/types';
import { TICKS_PER_TILE } from '../sim/tick';
import type { VillagerState } from '../sim/state';

const BODY_COLOR = 0xd9a441;
const WAITING_ICON_COLOR = 0xcc4433;
const BOUNCE_HEIGHT = 5;

export interface VillagerSprite {
  container: Container;
  update(villager: VillagerState, tickAlpha: number): void;
}

function tileTopLeftPixels(tile: Vec2): { x: number; y: number } {
  return { x: tile.x * TILE_SIZE, y: tile.y * TILE_SIZE };
}

export function createVillagerSprite(): VillagerSprite {
  const container = new Container();

  const body = new Container();
  const bodyShape = new Graphics()
    .circle(0, 0, TILE_SIZE * 0.18)
    .fill(BODY_COLOR)
    .circle(0, 0, TILE_SIZE * 0.18)
    .stroke({ color: 0x5c3a12, width: 2 });
  body.addChild(bodyShape);
  container.addChild(body);

  const carryingIcon = new Graphics()
    .rect(-7, -7, 14, 14)
    .fill(0xffffff)
    .rect(-7, -7, 14, 14)
    .stroke({ color: 0x33281a, width: 2 });
  carryingIcon.position.set(0, -TILE_SIZE * 0.32);
  carryingIcon.visible = false;
  container.addChild(carryingIcon);

  const waitingIcon = new Graphics()
    .circle(0, -TILE_SIZE * 0.4, 8)
    .fill(WAITING_ICON_COLOR)
    .circle(0, -TILE_SIZE * 0.4, 8)
    .stroke({ color: 0x5a1a12, width: 2 });
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

  function update(villager: VillagerState, tickAlpha: number): void {
    const fromPx = tileTopLeftPixels(villager.from);
    const half = TILE_SIZE / 2;

    if (villager.motion === 'walking') {
      const toPx = tileTopLeftPixels(villager.to);
      const progress = Math.min(1, (villager.segmentTicks + tickAlpha) / TICKS_PER_TILE);
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
    }

    if (villager.carrying) {
      carryingIcon.visible = true;
      carryingIcon.tint = RESOURCE_COLOR[villager.carrying];
    } else {
      carryingIcon.visible = false;
    }

    bundle.visible = villager.job.kind === 'arriving';
  }

  return { container, update };
}
