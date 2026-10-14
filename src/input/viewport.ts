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
    .clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM });

  // The map can be pushed around freely, even when it all fits on screen,
  // but its edge never goes past the middle of the screen — so it can
  // never be lost off to one side.
  viewport.on('moved', () => keepMapInView(viewport));

  return viewport;
}

export function keepMapInView(viewport: Viewport): void {
  const halfW = viewport.worldScreenWidth / 2;
  const halfH = viewport.worldScreenHeight / 2;
  const left = Math.min(Math.max(viewport.left, -halfW), viewport.worldWidth - halfW);
  const top = Math.min(Math.max(viewport.top, -halfH), viewport.worldHeight - halfH);
  if (left !== viewport.left) viewport.left = left;
  if (top !== viewport.top) viewport.top = top;
}
