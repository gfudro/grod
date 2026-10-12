import type { Application } from 'pixi.js';
import { Viewport } from 'pixi-viewport';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;

/**
 * Sets up the pan (one-finger drag) and pinch-to-zoom camera for the
 * map. No hover behaviour — everything works from touch alone.
 */
export function createMapViewport(
  app: Application,
  worldWidth: number,
  worldHeight: number,
): Viewport {
  const viewport = new Viewport({
    screenWidth: app.screen.width,
    screenHeight: app.screen.height,
    worldWidth,
    worldHeight,
    events: app.renderer.events,
  });

  viewport
    .drag()
    .pinch()
    .wheel()
    .clamp({ direction: 'all' })
    .clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM });

  return viewport;
}
