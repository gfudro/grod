import { Application } from 'pixi.js';
import type { Viewport } from 'pixi-viewport';
import { createMapViewport } from '../input/viewport';
import type { Season } from '../data/seasons';
import { createTerrainLayer, WORLD_PIXEL_HEIGHT, WORLD_PIXEL_WIDTH, type TerrainLayer } from './terrain';

export interface GameApp {
  app: Application;
  viewport: Viewport;
  terrain: TerrainLayer;
}

export async function createGameApp(container: HTMLElement, season: Season): Promise<GameApp> {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: '#2b2016',
    antialias: true,
  });
  container.appendChild(app.canvas);

  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  const viewport = createMapViewport(app, WORLD_PIXEL_WIDTH, WORLD_PIXEL_HEIGHT);
  app.stage.addChild(viewport);
  const terrain = createTerrainLayer(season);
  viewport.addChild(terrain.container);
  viewport.moveCenter(WORLD_PIXEL_WIDTH / 2, WORLD_PIXEL_HEIGHT / 2);

  return { app, viewport, terrain };
}
