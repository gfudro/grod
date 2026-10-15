import { createGameApp } from './render/app';
import { createRoadsLayer } from './render/roads';
import { createBuildingsLayer } from './render/buildings';
import { createBuildGhost } from './render/build-ghost';
import { createTargetHighlight } from './render/target-highlight';
import { createRangeHighlight } from './render/range-highlight';
import { createWarehouseMarker } from './render/markers';
import { createVillagerSprite } from './render/villager';
import { APP_VERSION, mountVersionLabel } from './ui/version';
import { mountChronicleScreen } from './ui/chronicle-screen';
import { mountVictoryScreen } from './ui/victory-screen';
import { nameMound } from './sim/mound';
import { bootGame, exportSave, importSave, saveGame, startNewGame } from './save/game-save';
import { requestPersistentStorage } from './save/storage';
import { nameVillage } from './sim/chronicle';
import { SEASON_TICKS } from './data/seasons';
import { mountHud } from './ui/hud';
import { mountTopBar } from './ui/topbar';
import { mountInspectPanel } from './ui/inspect-panel';
import { createRoadDrawController, type RoadDrawController } from './input/road-draw';
import { createBuildPlacementController, type BuildPlacementController } from './input/build-place';
import { createInspectController } from './input/inspect';
import { PLAYER_SPEEDS, SPEEDS, type SpeedMultiplier } from './sim/state';
import { inspectTile } from './sim/inspect';
import { setBuildingPaused } from './sim/building-control';
import { demolish } from './sim/demolish';
import { stepTicks, tick } from './sim/tick';
import { hungerStage } from './sim/hunger';
import { activeBlizzard } from './sim/blizzard';
import { createBlizzardLayer } from './render/blizzard';
import { currentSeason } from './sim/seasons';
import { createSnowfall } from './render/snowfall';
import { createStormLayer } from './render/storm';
import { startRebuild } from './sim/storms';
import { WAREHOUSE_TILE } from './data/waypoints';
import { TILE_SIZE } from './data/tiles';

const BASE_TICK_MS = 1000 / 10; // 10 ticks/second at x1

async function start(): Promise<void> {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('Brak elementu #app w index.html');
  }

  void requestPersistentStorage();
  const { state, canSave } = await bootGame();

  // Autosave each new season and whenever the app goes to the background
  // (iPad home button, app switcher, closing the tab).
  let autosave = canSave;
  function saveNow(): void {
    if (!autosave) return;
    saveGame(state, APP_VERSION).catch(() => {
      // Storage full or unavailable — the game goes on; export still works.
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveNow();
  });
  window.addEventListener('pagehide', saveNow);
  let savedSeason = Math.floor(state.tick / SEASON_TICKS);
  const { app, viewport, terrain } = await createGameApp(container, currentSeason(state));

  // The map area is shorter now that the menus have their own bands:
  // start the camera on the warehouse, where the gród begins.
  viewport.moveCenter((WAREHOUSE_TILE.x + 0.5) * TILE_SIZE, (WAREHOUSE_TILE.y + 0.5) * TILE_SIZE);

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

  const stormLayer = createStormLayer();
  viewport.addChild(stormLayer.container);

  const snowfall = createSnowfall();
  viewport.addChild(snowfall.container);

  const blizzardLayer = createBlizzardLayer();
  viewport.addChild(blizzardLayer.container);

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

  const showInspect = mountInspectPanel(
    (buildingId, paused) => {
      setBuildingPaused(state, buildingId, paused);
      refreshWorldLayers();
      const building = state.buildings.find((b) => b.id === buildingId);
      if (building) handleInspectResult(inspectTile(state, building.tile));
    },
    (id) => {
      if (demolish(state, id)) {
        handleInspectResult(null);
        refreshWorldLayers();
      }
    },
    (houseId) => {
      if (startRebuild(state, houseId)) {
        refreshWorldLayers();
        const house = state.houses.find((h) => h.id === houseId);
        if (house) handleInspectResult(inspectTile(state, house.tile));
      }
    },
    () => victory.open(),
  );

  createInspectController(
    viewport,
    state,
    () => roadDraw.isRoadMode() || roadDraw.isEraseMode() || buildPlace.armedType() !== null,
    handleInspectResult,
  );

  roadDraw = createRoadDrawController(viewport, state, refreshWorldLayers);
  buildPlace = createBuildPlacementController(viewport, state, refreshWorldLayers, buildGhost.update);

  // x10 and x60 are for dad's tests only: open the game with ?test in the address.
  const speeds: readonly SpeedMultiplier[] = new URLSearchParams(location.search).has('test') ? SPEEDS : PLAYER_SPEEDS;
  // A save from a game run at a speed that has no button here (x2, x3, x20 of
  // older versions, or x60 from a test) carries on at x1, so it's never stuck too fast.
  if (state.speed !== 0 && !speeds.includes(state.speed)) state.speed = 1;

  const hud = mountHud({
    roadDraw,
    buildPlace,
    state,
    speeds,
    getSpeed: () => state.speed,
    onSpeedChange: (speed: SpeedMultiplier) => {
      state.speed = speed;
    },
  });
  const topBar = mountTopBar();

  /** Replacing the game: stop autosaving the old one, then start afresh from storage. */
  async function restartWith(prepare: () => Promise<void>): Promise<void> {
    autosave = false;
    await prepare();
    location.reload();
  }

  // Chronicle and victory screen both stop the game while they are open.
  let speedBeforeOverlay: SpeedMultiplier = 1;
  function pauseForOverlay(open: boolean): void {
    if (open) {
      speedBeforeOverlay = state.speed;
      state.speed = 0;
    } else {
      state.speed = speedBeforeOverlay;
    }
    hud.refresh();
  }

  mountChronicleScreen({
    getState: () => state,
    buttonSlot: hud.extraSlot,
    onRename: (name) => {
      if (nameVillage(state, name)) saveNow();
    },
    onExport: () => void exportSave(state, APP_VERSION),
    onImport: async (file) => {
      autosave = false;
      if (!(await importSave(file))) {
        autosave = canSave;
        return false;
      }
      location.reload();
      return true;
    },
    onNewGame: () => void restartWith(startNewGame),
    // The game waits while dad reads the chronicle.
    onOpenChange: pauseForOverlay,
  });

  const victory = mountVictoryScreen({
    getState: () => state,
    onNameMound: (name) => {
      if (nameMound(state, name)) {
        saveNow();
        refreshWorldLayers();
      }
    },
    onNewGame: () => void restartWith(startNewGame),
    onOpenChange: pauseForOverlay,
  });

  /** The last material reached the kopiec: the end of the game, celebrated once. */
  function celebrateMound(): void {
    if (!state.mound?.done || state.mound.celebrated) return;
    state.mound.celebrated = true;
    victory.open();
    saveNow();
  }
  refreshWorldLayers();
  celebrateMound(); // finished in a save from before the screen was seen

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
        const v = state.villagers[i];
        villagerSprites[i].update(v, alpha, stepTicks(state, v), hungerStage(state, v));
      }
    } else {
      for (let i = 0; i < state.villagers.length; i++) {
        const v = state.villagers[i];
        villagerSprites[i].update(v, 0, stepTicks(state, v), hungerStage(state, v));
      }
    }
    if (ticked) {
      refreshWorldLayers();
      celebrateMound();
    }
    const season = Math.floor(state.tick / SEASON_TICKS);
    if (season !== savedSeason) {
      savedSeason = season;
      saveNow();
    }
    // Flakes speed up a little with the game, but never into a blur.
    stormLayer.update(state, performance.now());
    snowfall.update(
      state.speed > 0 ? ticker.deltaMS * Math.min(state.speed, 3) : 0,
      currentSeason(state) === 'zima',
      activeBlizzard(state) !== null,
    );
    blizzardLayer.update(state, performance.now());
  });

  mountVersionLabel();

  // Dev-only handle for setting up test situations from the browser console.
  if (import.meta.env.DEV) {
    const advance = (ticks: number): void => {
      for (let i = 0; i < ticks; i++) tick(state);
      syncVillagerSprites();
      refreshWorldLayers();
      celebrateMound();
    };
    (window as unknown as { grod: unknown }).grod = { state, refresh: refreshWorldLayers, advance };
  }
}

start();
