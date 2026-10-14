import { createGameApp } from './render/app';
import { createRoadsLayer } from './render/roads';
import { createBuildingsLayer } from './render/buildings';
import { createBuildGhost } from './render/build-ghost';
import { createTargetHighlight } from './render/target-highlight';
import { createRangeHighlight } from './render/range-highlight';
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
import { inspectTile } from './sim/inspect';
import { setBuildingPaused } from './sim/building-control';
import { tick } from './sim/tick';
import { currentSeason } from './sim/seasons';
import { createSnowfall } from './render/snowfall';
import { WAREHOUSE_TILE } from './data/waypoints';

const BASE_TICK_MS = 1000 / 10; // 10 ticks/second at x1

async function start(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Brak elementu #app w index.html');
  }

  const state = createInitialState();
  const { app, viewport, terrain } = await createGameApp(container, currentSeason(state));

  const roadsLayer = createRoadsLayer();
  viewport.addChild(roadsLayer.container);

  const rangeHighlight = createRangeHighlight();
  viewport.addChild(rangeHighlight.container);

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

  const targetHighlight = createTargetHighlight();
  viewport.addChild(targetHighlight.container);

  const snowfall = createSnowfall();
  viewport.addChild(snowfall.container);

  function refreshWorldLayers(): void {
    terrain.setSeason(currentSeason(state));
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

  function handleInspectResult(info: ReturnType<typeof inspectTile>): void {
    showInspect(info);
    // Show exactly where a building/worker is trying to reach — answers
    // "why is my drwal stuck?" without the player having to guess.
    targetHighlight.update(
      info?.kind === 'building' ? info.resourceTile : info?.kind === 'villager' ? info.targetTile : null,
    );
    // Tapping a studnia (or a house it serves) shades the well's range.
    rangeHighlight.update(info?.kind === 'building' || info?.kind === 'house' ? info.rangeTiles : null);
  }

  const showInspect = mountInspectPanel((buildingId, paused) => {
    setBuildingPaused(state, buildingId, paused);
    refreshWorldLayers();
    const building = state.buildings.find((b) => b.id === buildingId);
    if (building) handleInspectResult(inspectTile(state, building.tile));
  });

  createInspectController(
    viewport,
    state,
    () => roadDraw.isRoadMode() || buildPlace.armedType() !== null,
    handleInspectResult,
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
    snowfall.update(state.speed > 0 ? ticker.deltaMS * state.speed : 0, currentSeason(state) === 'zima');
  });

  mountVersionLabel();

  // Dev-only handle for setting up test situations from the browser console.
  if (import.meta.env.DEV) {
    const advance = (ticks: number): void => {
      for (let i = 0; i < ticks; i++) tick(state);
      syncVillagerSprites();
      refreshWorldLayers();
    };
    (window as unknown as { grod: unknown }).grod = { state, refresh: refreshWorldLayers, advance };
  }
}

start();
