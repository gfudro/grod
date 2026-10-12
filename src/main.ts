import { createGameApp } from './render/app';
import { createRoadsLayer } from './render/roads';
import { createBuildingsLayer } from './render/buildings';
import { createBuildGhost } from './render/build-ghost';
import { createWarehouseMarker } from './render/markers';
import { createVillagerSprite } from './render/villager';
import { mountVersionLabel } from './ui/version';
import { mountHud } from './ui/hud';
import { mountTopBar } from './ui/topbar';
import { mountInspectPanel } from './ui/inspect-panel';
import { createRoadDrawController, type RoadDrawController } from './input/road-draw';
import { createBuildPlacementController, type BuildPlacementController } from './input/build-place';
import { createInspectController } from './input/inspect';
import { createInitialState, type SpeedMultiplier } from './sim/state';
import { tick } from './sim/tick';
import { WAREHOUSE_TILE } from './data/waypoints';

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

  const buildingsLayer = createBuildingsLayer();
  viewport.addChild(buildingsLayer.container);

  const warehouseMarker = createWarehouseMarker(WAREHOUSE_TILE);
  viewport.addChild(warehouseMarker.container);

  const villagerSprites = state.villagers.map(() => createVillagerSprite());
  for (const sprite of villagerSprites) viewport.addChild(sprite.container);

  /** New settlers join state.villagers at runtime — keep sprites in sync. */
  function syncVillagerSprites(): void {
    while (villagerSprites.length < state.villagers.length) {
      const sprite = createVillagerSprite();
      viewport.addChild(sprite.container);
      villagerSprites.push(sprite);
    }
  }

  const buildGhost = createBuildGhost();
  viewport.addChild(buildGhost.container);

  function refreshWorldLayers(): void {
    roadsLayer.redraw(state.roads);
    buildingsLayer.redraw(state);
    warehouseMarker.update(state.roads);
    hud.refresh();
    topBar.refresh(state);
  }

  // Registered before road-draw/build-place below so it sees each click's
  // mode flags *before* those controllers consume and clear them.
  let roadDraw: RoadDrawController;
  let buildPlace: BuildPlacementController;
  const showInspect = mountInspectPanel();
  createInspectController(
    viewport,
    state,
    () => roadDraw.isRoadMode() || buildPlace.armedType() !== null,
    showInspect,
  );

  roadDraw = createRoadDrawController(viewport, state, refreshWorldLayers);
  buildPlace = createBuildPlacementController(viewport, state, refreshWorldLayers, buildGhost.update);

  const hud = mountHud({
    roadDraw,
    buildPlace,
    state,
    getSpeed: () => state.speed,
    onSpeedChange: (speed: SpeedMultiplier) => {
      state.speed = speed;
    },
  });
  const topBar = mountTopBar();
  refreshWorldLayers();

  let accumulatorMs = 0;
  app.ticker.add((ticker) => {
    let ticked = false;
    if (state.speed > 0) {
      const tickMs = BASE_TICK_MS / state.speed;
      accumulatorMs += ticker.deltaMS;
      while (accumulatorMs >= tickMs) {
        tick(state);
        accumulatorMs -= tickMs;
        ticked = true;
      }
      if (ticked) syncVillagerSprites();
      const alpha = accumulatorMs / tickMs;
      for (let i = 0; i < state.villagers.length; i++) {
        villagerSprites[i].update(state.villagers[i], alpha);
      }
    } else {
      for (let i = 0; i < state.villagers.length; i++) {
        villagerSprites[i].update(state.villagers[i], 0);
      }
    }
    if (ticked) refreshWorldLayers();
  });

  mountVersionLabel();
}

start();
