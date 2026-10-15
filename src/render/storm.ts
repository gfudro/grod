import { Container, Graphics } from 'pixi.js';
import { STORM } from '../data/storms';
import { TILE_SIZE } from '../data/tiles';
import type { GameState } from '../sim/state';
import { protectingKontyna } from '../sim/storms';
import { WORLD_PIXEL_HEIGHT, WORLD_PIXEL_WIDTH } from './terrain';

const CLOUD_COLOR = 0x3c4250;
const CLOUD_DARK = 0x2a2e38;
const RAIN_COLOR = 0x9fc4e8;
const BOLT_COLOR = 0xffe14d;
const SHADOW_COLOR = 0x10141c;
/** The cloud floats this far above the house, so the house stays in view. */
const CLOUD_LIFT = TILE_SIZE * 1.1;

export interface StormLayer {
  container: Container;
  update(state: GameState, timeMs: number): void;
}

/**
 * The storm cloud drifting in from the west edge and hanging over its
 * house, rain under it, and the bolt with a flash when it strikes.
 */
export function createStormLayer(): StormLayer {
  const container = new Container();
  container.eventMode = 'none';
  const graphics = new Graphics();
  container.addChild(graphics);

  function update(state: GameState, timeMs: number): void {
    graphics.clear();

    for (const storm of state.storms) {
      if (storm.houseId === null) continue;
      const house = state.houses.find((h) => h.id === storm.houseId);
      if (!house) continue;
      const targetX = (house.tile.x + 0.5) * TILE_SIZE;
      const targetY = (house.tile.y + 0.5) * TILE_SIZE - CLOUD_LIFT;
      const travel = Math.min(1, (state.tick - storm.appearTick) / STORM.cloudTravelTicks);
      const eased = 1 - (1 - travel) * (1 - travel);
      const startX = -TILE_SIZE * 2;
      const x = startX + (targetX - startX) * eased;
      const y = targetY;
      const sway = Math.sin(timeMs / 700) * 4;

      // Shadow on the ground, then rain, then the cloud itself.
      graphics.ellipse(x, y + CLOUD_LIFT + 4, TILE_SIZE * 0.9, TILE_SIZE * 0.45).fill({ color: SHADOW_COLOR, alpha: 0.28 });
      for (let i = 0; i < 9; i++) {
        const rx = x - TILE_SIZE * 0.7 + (i * TILE_SIZE * 1.4) / 8;
        const phase = ((timeMs / 400 + i * 0.37) % 1) * CLOUD_LIFT;
        graphics
          .moveTo(rx, y + 12 + phase)
          .lineTo(rx - 4, y + 26 + phase)
          .stroke({ color: RAIN_COLOR, width: 2, alpha: 0.7 });
      }
      // Under the kontyna's wing the cloud is grey; over an unguarded house it is near black.
      const guarded = protectingKontyna(state, house) !== null;
      const body = guarded ? CLOUD_COLOR : CLOUD_DARK;
      for (const [dx, dy, r] of [[-28, 4, 20], [-8, -8, 26], [18, -2, 22], [34, 8, 16], [4, 10, 20]]) {
        graphics.circle(x + dx + sway, y + dy, r).fill(body);
      }
      graphics.ellipse(x + 3 + sway, y + 14, 48, 12).fill(body);
      // A small bolt inside the cloud, so it reads as a storm, not as smoke.
      const zx = x + sway;
      graphics
        .poly([zx - 2, y - 10, zx + 7, y - 10, zx + 2, y, zx + 9, y, zx - 6, y + 18, zx - 1, y + 4, zx - 7, y + 4])
        .fill(BOLT_COLOR);
    }

    const strike = state.lastStrike;
    if (strike) {
      const age = state.tick - strike.tick;
      const fade = Math.max(0, 1 - age / STORM.flashTicks);
      const bx = (strike.tile.x + 0.5) * TILE_SIZE;
      const by = (strike.tile.y + 0.5) * TILE_SIZE;
      const top = by - CLOUD_LIFT - TILE_SIZE;
      const points: number[] = [bx, top];
      const steps = 6;
      for (let i = 1; i < steps; i++) {
        points.push(bx + (i % 2 === 0 ? -10 : 10), top + ((by - top) * i) / steps);
      }
      points.push(bx, by);
      for (const [width, color] of [[10, 0xffffff], [5, BOLT_COLOR]] as const) {
        graphics.moveTo(points[0], points[1]);
        for (let i = 2; i < points.length; i += 2) graphics.lineTo(points[i], points[i + 1]);
        graphics.stroke({ color, width, alpha: fade });
      }
      if (age < 4) {
        graphics.rect(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT).fill({ color: 0xffffff, alpha: 0.25 * (1 - age / 4) });
      }
    }
  }

  return { container, update };
}
