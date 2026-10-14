import { Container, Graphics } from 'pixi.js';
import { WORLD_PIXEL_HEIGHT, WORLD_PIXEL_WIDTH } from './terrain';

const FLAKE_COUNT = 140;
const FALL_SPEED = 0.03; // world pixels per ms

interface Flake {
  g: Graphics;
  speed: number;
  phase: number;
}

export interface Snowfall {
  container: Container;
  /** Animates the flakes; hides them entirely outside winter. */
  update(deltaMs: number, active: boolean): void;
}

/**
 * Falling snowflakes over the whole map in winter. Purely decorative and
 * deliberately not part of the simulation (no RNG state is touched).
 */
export function createSnowfall(): Snowfall {
  const container = new Container();
  container.eventMode = 'none';
  const flakes: Flake[] = [];
  // A fixed pseudo-random spread so the layout is the same every time.
  let seed = 7;
  const rand = (): number => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let i = 0; i < FLAKE_COUNT; i++) {
    const radius = 1.5 + rand() * 2;
    const g = new Graphics().circle(0, 0, radius).fill({ color: 0xffffff, alpha: 0.85 });
    g.position.set(rand() * WORLD_PIXEL_WIDTH, rand() * WORLD_PIXEL_HEIGHT);
    container.addChild(g);
    flakes.push({ g, speed: FALL_SPEED * (0.6 + rand() * 0.8), phase: rand() * Math.PI * 2 });
  }

  function update(deltaMs: number, active: boolean): void {
    container.visible = active;
    if (!active) return;
    for (const flake of flakes) {
      flake.phase += deltaMs * 0.002;
      flake.g.y += flake.speed * deltaMs;
      flake.g.x += Math.sin(flake.phase) * 0.3;
      if (flake.g.y > WORLD_PIXEL_HEIGHT) flake.g.y -= WORLD_PIXEL_HEIGHT;
      if (flake.g.x < 0) flake.g.x += WORLD_PIXEL_WIDTH;
      if (flake.g.x > WORLD_PIXEL_WIDTH) flake.g.x -= WORLD_PIXEL_WIDTH;
    }
  }

  return { container, update };
}
