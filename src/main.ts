import { createGameApp } from './render/app';
import { createRoadsLayer } from './render/roads';
import { createWarehouseMarker, createWaypointMarker } from './render/markers';
import { createVillagerSprite } from './render/villager';
import { mountVersionLabel } from './ui/version';
import { mountHud } from './ui/hud';
import { createRoadDrawController } from './input/road-draw';
import { createInitialState, type SpeedMultiplier } from './sim/state';
import { tick } from './sim/tick';
import { WAREHOUSE_TILE, SECOND_WAYPOINT } from './data/waypoints';

const BASE_TICK_MS = 1000 / 10; // 10 ticks/second at x1

async function start(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Brak elementu #app w index.html');
  }

  const { app, viewport } = await createGameApp(container);
  const state = createInitialState();

  const roadsLayer = createRoadsLayer();
  viewport.addChild(roadsLayer.container);
  viewport.addChild(createWarehouseMarker(WAREHOUSE_TILE));
  viewport.addChild(createWaypointMarker(SECOND_WAYPOINT));

  const villagerSprite = createVillagerSprite();
  viewport.addChild(villagerSprite.container);

  function redrawRoads(): void {
    roadsLayer.redraw(state.roads);
    hud.refresh();
  }
  roadsLayer.redraw(state.roads);

  const roadDraw = createRoadDrawController(viewport, state, redrawRoads);

  const hud = mountHud({
    roadDraw,
    getSpeed: () => state.speed,
    onSpeedChange: (speed: SpeedMultiplier) => {
      state.speed = speed;
    },
  });

  let accumulatorMs = 0;
  app.ticker.add((ticker) => {
    if (state.speed > 0) {
      const tickMs = BASE_TICK_MS / state.speed;
      accumulatorMs += ticker.deltaMS;
      while (accumulatorMs >= tickMs) {
        tick(state);
        accumulatorMs -= tickMs;
      }
      villagerSprite.update(state.villager, accumulatorMs / tickMs);
    } else {
      villagerSprite.update(state.villager, 0);
    }
  });

  mountVersionLabel();
}

start();
