import { Container, Graphics } from 'pixi.js';
import { BLIZZARD } from '../data/blizzard';
import type { GameState } from '../sim/state';
import { activeBlizzard, comingBlizzard } from '../sim/blizzard';
import { WORLD_PIXEL_HEIGHT, WORLD_PIXEL_WIDTH } from './terrain';

const SNOW_WALL = 0xf2f6fa;

export interface BlizzardLayer {
  container: Container;
  update(state: GameState, timeMs: number): void;
}

/**
 * A blizzard seen coming: a white wall of snow grows over the north edge
 * of the map through the days before it hits. While it blows the whole
 * map goes pale, in gusts (the flakes themselves are in snowfall.ts).
 */
export function createBlizzardLayer(): BlizzardLayer {
  const container = new Container();
  container.eventMode = 'none';
  const graphics = new Graphics();
  container.addChild(graphics);

  function update(state: GameState, timeMs: number): void {
    graphics.clear();
    const coming = comingBlizzard(state);
    if (coming) {
      const progress = Math.min(1, (state.tick - coming.appearTick) / BLIZZARD.warningTicks);
      const depth = WORLD_PIXEL_HEIGHT * (0.08 + 0.3 * progress);
      // Bands fading southwards, with a wavy lower edge.
      for (let band = 0; band < 6; band++) {
        const y = (depth * band) / 6;
        graphics.rect(0, 0, WORLD_PIXEL_WIDTH, depth - y).fill({ color: SNOW_WALL, alpha: 0.12 });
      }
      for (let x = 0; x < WORLD_PIXEL_WIDTH; x += 96) {
        const wobble = Math.sin(timeMs / 600 + x / 150) * 14;
        graphics.circle(x + 48, depth + wobble, 52).fill({ color: SNOW_WALL, alpha: 0.35 });
      }
    }
    if (activeBlizzard(state)) {
      const gust = 0.28 + 0.1 * Math.sin(timeMs / 450);
      graphics.rect(0, 0, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT).fill({ color: SNOW_WALL, alpha: gust });
    }
  }

  return { container, update };
}
