import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { HOUSE_TIERS } from '../data/houses';
import { RESOURCE_COLOR } from '../data/resources';
import { TILE_SIZE } from '../data/tiles';
import { footprintTiles, footprintTouchesRoad } from '../sim/footprint';
import { houseGoodTarget, houseTier, houseWantedGoods, upgradeReadiness } from '../sim/houses';
import { isAdjacentToRoad } from '../sim/pathfinding';
import { currentSeason, houseShortages } from '../sim/seasons';
import { RUINS_REBUILD, STORM } from '../data/storms';
import { houseGood, type FieldPlot, type GameState, type House, type Mound, type PlotStage } from '../sim/state';
import { MOUND } from '../data/mound';
import { moundLayers, moundMissing } from '../sim/mound';
import { buildersOn } from '../sim/construction';

const SITE_COLOR = 0x9b7a4a;
const SITE_PROGRESS_COLOR = 0xd9b96a;
export const BUILDING_COLOR: Record<string, number> = {
  drwal: 0x5c4326,
  rybak: 0x3f5f6b,
  glinianka: 0x9b4a3f,
  pole: 0x7a5530,
  zarna: 0x7d7468,
  studnia: 0x4f7fa0,
  ziemianka: 0x8a6a42,
  obora: 0x6b4a2e,
  serowarnia: 0xc08a2a,
  plac: 0xa0527a,
  kontyna: 0x5a4f8a,
  owczarnia: 0x7a6a52,
  tkalnia: 0x7a4a8a,
  kamieniarz: 0x6b7075,
  rudnik: 0x5a4a2a,
  dymarka: 0x8a3a24,
  kuznia: 0x3a3f46,
  kopiec: 0x7a9a4a,
};
/** Placeholder labels where the first letter alone would clash (STUDNIA / SEROWARNIA, OBORA / OWCZARNIA). */
const BUILDING_LABEL: Partial<Record<BuildingType, string>> = {
  serowarnia: 'SER',
  plac: 'WIEC',
  owczarnia: 'OWCE',
  // KAMIENIARZ / KUŹNIA / KOPIEC, RUDNIK / RYBAK, DYMARKA / DRWAL
  kamieniarz: 'KAM',
  kuznia: 'KUŹ',
  rudnik: 'RUDA',
  dymarka: 'DYM',
};
/** Body colour per house tier (HOUSE_TIERS index). */
const HOUSE_TIER_COLOR = [0x8a6a42, 0xb48a52, 0xc79a5e, 0xd8b47a];
/** Roof colour per house tier; a ziemianka has none. */
const ROOF_COLOR: (number | null)[] = [null, 0xc9a24a, 0x9a5a2e, 0x7a3a22];
/** House labels per tier; ZIEMIANKA and ZAGRODA share a first letter, so the higher tiers spell out more. */
const HOUSE_TIER_LABEL = ['Z', 'C', 'ZAG', 'DWÓR'];
const FENCE_COLOR = 0x5e3f22;
const COW_COLOR = 0xffffff;
const SHEEP_COLOR = 0xf2ede2;
const PLOT_COLOR: Record<PlotStage, number> = {
  zaorane: 0x7a5530,
  kielki: 0x7a5530,
  lodygi: 0x6b6a2e,
  dojrzale: 0xe0b84a,
  sciete: 0xc8b27a,
};
const SPROUT_COLOR = 0x7fc04a;
const STALK_COLOR = 0x4f8f2a;
const SNOW_COLOR = 0xf4f7fb;
const STUBBLE_COLOR = 0x9a8350;
const FURROW_COLOR = 0x5e3f22;
const NO_ROAD_COLOR = 0xcc4433;
const PAUSED_OVERLAY_COLOR = 0x3a3a3a;
const PAUSED_STRIPE_COLOR = 0x1e1e1e;
const PAUSED_BADGE_COLOR = 0xd2321e;
const PAUSED_ICON_COLOR = 0xffffff;
/** The service marker on a house is lit in the colour of the service it needs. */
const SERVICE_ON_COLOR: Partial<Record<BuildingType, number>> = {
  studnia: 0x4f9fd8,
  plac: 0xd06aa0,
  kontyna: 0x9a8ae0,
};
const SERVICE_OFF_COLOR = 0x6b6258;
const ASH_COLOR = 0x3a3330;
const CHAR_COLOR = 0x1a1412;
const SMOKE_COLOR = 0x8a8580;
const EMBER_COLOR = 0xd9531e;
const FLAME_OUTER = 0xf07a1a;
const FLAME_INNER = 0xffd23f;
const FIRE_TIMER_COLOR = 0xffe14d;
const WATER_COLOR = 0x4f9fd8;
const COUNTER_BG_COLOR = 0x2b2016;
const DRIFT_COLOR = 0xffffff;
const DRIFT_SHADE = 0xa9c0d0;
const STRIKE_COLOR = 0xd2321e;
const MOUND_EARTH = 0x8a6a42;
const MOUND_RIM = 0x4a3218;
/** Raw earth layers while it's being heaped up, alternating so each is visible. */
const MOUND_LAYER = [0x9b7a4a, 0xb08a52];
/** Grassed over once it's finished. */
const MOUND_GRASS = [0x5f9a3a, 0x6fae44];
/** Drewno's own colour is too dark to read on the counter background. */
const FIREWOOD_TEXT_COLOR = 0xf2bf7e;

export interface BuildingsLayer {
  container: Container;
  redraw(state: GameState): void;
}

function tileTopLeft(x: number, y: number): { px: number; py: number } {
  return { px: x * TILE_SIZE, py: y * TILE_SIZE };
}

function footprintSize(type: BuildingType): { w: number; h: number } {
  return BUILDINGS[type].footprint ?? { w: 1, h: 1 };
}

export function createBuildingsLayer(): BuildingsLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);
  const labels = new Container();
  container.addChild(labels);

  function addLabel(text: string, x: number, y: number, fill: number, fontSize: number, anchorY = 0.5): void {
    const label = new Text({ text, style: { fill, fontSize, fontWeight: 'bold', fontFamily: 'sans-serif' } });
    label.anchor.set(0.5, anchorY);
    label.position.set(x, y);
    labels.addChild(label);
  }

  function redraw(state: GameState): void {
    graphics.clear();
    for (const child of labels.removeChildren()) child.destroy();

    const inset = TILE_SIZE * 0.1;
    const winter = currentSeason(state) === 'zima';

    // Snow drifts on the roads after a blizzard: white heaps, slow to wade through.
    for (const key of state.drifts) {
      const [x, y] = key.split(',').map(Number);
      const { px, py } = tileTopLeft(x, y);
      graphics
        .ellipse(px + TILE_SIZE * 0.5, py + TILE_SIZE * 0.58, TILE_SIZE * 0.46, TILE_SIZE * 0.3)
        .fill(DRIFT_COLOR)
        .ellipse(px + TILE_SIZE * 0.36, py + TILE_SIZE * 0.42, TILE_SIZE * 0.24, TILE_SIZE * 0.18)
        .fill(DRIFT_COLOR)
        .ellipse(px + TILE_SIZE * 0.5, py + TILE_SIZE * 0.58, TILE_SIZE * 0.46, TILE_SIZE * 0.3)
        .stroke({ color: DRIFT_SHADE, width: 2 });
    }

    for (const site of state.sites) {
      const { px, py } = tileTopLeft(site.tile.x, site.tile.y);
      const { w, h } = footprintSize(site.type);
      const width = w * TILE_SIZE - inset * 2;
      const height = h * TILE_SIZE - inset * 2;
      graphics
        .rect(px + inset, py + inset, width, height)
        .fill(SITE_COLOR)
        .rect(px + inset, py + inset, width, height)
        .stroke({ color: 0x3a2b16, width: 2 });

      const worker = buildersOn(state, { kind: 'build', siteId: site.id }).find((v) => 'stage' in v.job && v.job.stage === 'hammering');
      const def = BUILDINGS[site.type];
      let progress = 0;
      if (worker && worker.job.kind === 'build' && worker.job.stage === 'hammering') {
        progress = 1 - worker.workTicksRemaining / def.buildTicks;
      }
      if (progress > 0) {
        const filled = height * progress;
        graphics.rect(px + inset, py + inset + (height - filled), width, filled).fill(SITE_PROGRESS_COLOR);
      }
    }

    for (const building of state.buildings) {
      const { px, py } = tileTopLeft(building.tile.x, building.tile.y);
      const def = BUILDINGS[building.type];

      if (building.plots) {
        const tiles = footprintTiles(building.type, building.tile);
        const plotYield = def.plotYield ?? 1;
        building.plots.forEach((plot, i) =>
          drawPlot(graphics, tiles[i].x * TILE_SIZE, tiles[i].y * TILE_SIZE, plot, plotYield),
        );
        const { w, h } = footprintSize(building.type);
        if (winter) {
          graphics.rect(px + 2, py + 2, w * TILE_SIZE - 4, h * TILE_SIZE - 4).fill({ color: SNOW_COLOR, alpha: 0.55 });
        }
        graphics
          .rect(px + 2, py + 2, w * TILE_SIZE - 4, h * TILE_SIZE - 4)
          .stroke({ color: 0x4a3218, width: 3 });
      } else {
        const size = TILE_SIZE - inset * 2;
        graphics
          .rect(px + inset, py + inset, size, size)
          .fill(BUILDING_COLOR[building.type] ?? 0x555555)
          .rect(px + inset, py + inset, size, size)
          .stroke({ color: 0x241a0d, width: 3 });
        if (building.type === 'obora') drawCow(graphics, px + TILE_SIZE - inset - 14, py + TILE_SIZE - inset - 10);
        if (building.type === 'owczarnia') drawSheep(graphics, px + TILE_SIZE - inset - 14, py + TILE_SIZE - inset - 10);
        if (winter) drawSnowCap(graphics, px + inset, py + inset, size);
        const label = BUILDING_LABEL[building.type] ?? def.name[0];
        addLabel(label, px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0xf4e9d8, label.length > 1 ? 16 : 24);
      }

      if (building.paused) {
        const { w, h } = footprintSize(building.type);
        drawPausedOverlay(graphics, px, py, w * TILE_SIZE, h * TILE_SIZE, inset);
      } else if (!footprintTouchesRoad(building.type, building.tile, state.roads)) {
        drawNoRoadIcon(graphics, px, py, inset);
      }
    }

    for (const house of state.houses) {
      drawHouse(state, house, winter);
    }

    if (state.mound) drawMound(state, state.mound, winter);
  }

  /**
   * The kopiec: a ring of marked-out earth that fills with layers as the
   * materials arrive, each one smaller and higher, until a green mound
   * with a post on top stands there. Counters under it say what's left.
   */
  function drawMound(state: GameState, mound: Mound, winter: boolean): void {
    const { px, py } = tileTopLeft(mound.tile.x, mound.tile.y);
    const size = 3 * TILE_SIZE;
    const cx = px + size / 2;
    const cy = py + size / 2 + 6;
    const layers = moundLayers(mound);

    // The marked-out ground: stakes at the corners, a ring of dug earth.
    graphics.ellipse(cx, cy, size * 0.46, size * 0.4).fill({ color: MOUND_EARTH, alpha: 0.55 });
    graphics.ellipse(cx, cy, size * 0.46, size * 0.4).stroke({ color: MOUND_RIM, width: 3 });
    for (const [sx, sy] of [[0.08, 0.08], [0.92, 0.08], [0.08, 0.92], [0.92, 0.92]]) {
      graphics.rect(px + size * sx - 3, py + size * sy - 8, 6, 14).fill(FENCE_COLOR);
    }

    for (let layer = 0; layer < layers; layer++) {
      const t = layer / MOUND.layers;
      const rx = size * 0.44 * (1 - t * 0.75);
      const ry = size * 0.38 * (1 - t * 0.75);
      const lift = layer * 10;
      const fill = mound.done ? (winter ? SNOW_COLOR : MOUND_GRASS[layer % 2]) : MOUND_LAYER[layer % 2];
      graphics.ellipse(cx, cy - lift, rx, ry).fill(fill).stroke({ color: MOUND_RIM, width: 2 });
    }

    if (mound.done) {
      // A tall post with a pennant on the top.
      const top = cy - (MOUND.layers - 1) * 10;
      graphics.rect(cx - 3, top - 54, 6, 54).fill(FENCE_COLOR);
      graphics.poly([cx + 3, top - 54, cx + 34, top - 46, cx + 3, top - 36]).fill(0xd2321e).stroke({ color: 0x5a1a12, width: 2 });
      addLabel(mound.name || 'KOPIEC', cx, py + size - 14, 0xf4e9d8, 18);
      return;
    }

    // Counters along the bottom, like the ones under a house.
    const goods = Object.entries(MOUND.cost) as [keyof typeof MOUND.cost, number][];
    const slot = (size - 24) / goods.length;
    graphics.roundRect(px + 12, py + size - 26, size - 24, 22, 6).fill({ color: COUNTER_BG_COLOR, alpha: 0.9 });
    goods.forEach(([resource, target], i) => {
      addLabel(
        `${mound.delivered[resource] ?? 0}/${target}`,
        px + 12 + slot * i + slot / 2,
        py + size - 15,
        resource === 'drewno' ? FIREWOOD_TEXT_COLOR : RESOURCE_COLOR[resource],
        15,
      );
    });
    addLabel('KOPIEC', cx, py + 14, 0xf4e9d8, 16);

    // What the mound is waiting for, in that material's colour (white rim, like a house waiting to grow).
    moundMissing(state).forEach((resource, i) => {
      const bx = cx - 10 * (moundMissing(state).length - 1) + i * 20;
      graphics.circle(bx, py + 36, 9).fill(RESOURCE_COLOR[resource]).circle(bx, py + 36, 9).stroke({ color: 0xffffff, width: 3 });
    });
    if (!footprintTouchesRoad('kopiec', mound.tile, state.roads)) drawNoRoadIcon(graphics, px + TILE_SIZE, py, TILE_SIZE * 0.1);
  }

  function drawHouse(state: GameState, house: House, winter: boolean): void {
    const { px, py } = tileTopLeft(house.tile.x, house.tile.y);
    const inset = TILE_SIZE * 0.1;
    const size = TILE_SIZE - inset * 2;
    if (house.ruined) {
      drawRuins(state, house, px, py, inset, size);
      return;
    }
    graphics
      .rect(px + inset, py + inset, size, size)
      .fill(HOUSE_TIER_COLOR[house.tier] ?? HOUSE_TIER_COLOR[0])
      .rect(px + inset, py + inset, size, size)
      .stroke({ color: 0x241a0d, width: 3 });
    if (house.tier >= 2) {
      // A zagroda stands inside its own fence.
      for (const fx of [px + 2, px + TILE_SIZE - 5]) {
        graphics.rect(fx, py + inset + 6, 3, size - 8).fill(FENCE_COLOR);
      }
    }
    const roof = ROOF_COLOR[house.tier] ?? null;
    if (roof !== null) {
      // A chata gets a thatched roof, a zagroda a taller wooden one and a
      // dwór the tallest, so the growth is visible at a glance.
      const peak = house.tier >= 3 ? 20 : house.tier >= 2 ? 14 : 8;
      graphics
        .poly([px + inset - 3, py + inset + 10, px + TILE_SIZE / 2, py + inset - peak, px + TILE_SIZE - inset + 3, py + inset + 10])
        .fill(roof)
        .stroke({ color: 0x4a3218, width: 2 });
    }
    if (winter) drawSnowCap(graphics, px + inset, py + inset - (house.tier >= 1 ? 6 : 0), size);
    if (house.tier >= 3) {
      // A dwór has a gable window under its tall roof.
      graphics.rect(px + TILE_SIZE / 2 - 4, py + inset - 6, 8, 8).fill(0xffd98a).stroke({ color: 0x4a3218, width: 1.5 });
    }
    const houseLabel = HOUSE_TIER_LABEL[house.tier] ?? houseTier(house).name[0];
    addLabel(houseLabel, px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 2, 0xf4e9d8, houseLabel.length > 3 ? 14 : houseLabel.length > 1 ? 16 : 24);

    if (house.upgrade) {
      // Rebuild in progress: the same rising fill as a construction site.
      const worker = buildersOn(state, { kind: 'upgrade', houseId: house.id }).find((v) => 'stage' in v.job && v.job.stage === 'hammering');
      const buildTicks = houseTier(house).upgrade?.buildTicks ?? 1;
      if (worker && worker.job.kind === 'upgrade' && worker.job.stage === 'hammering') {
        const filled = size * (1 - worker.workTicksRemaining / buildTicks);
        graphics
          .rect(px + inset, py + inset + (size - filled), size, filled)
          .fill({ color: SITE_PROGRESS_COLOR, alpha: 0.7 });
      }
      graphics.rect(px + inset, py + inset, size, size).stroke({ color: SITE_PROGRESS_COLOR, width: 3 });
    }

    // Need counters under the house, one per good, in that good's colour,
    // on a dark strip so they read against grass and road alike.
    // Food counters on a strip under the house, never wider than the
    // tile so neighbouring houses' counters can't overlap.
    const season = currentSeason(state);
    const goods = houseWantedGoods(house, season).filter((r) => r !== 'drewno');
    // Four counters (zagroda, dwór) don't fit one row, so they go two by two.
    const perRow = goods.length >= 4 ? 2 : Math.max(goods.length, 1);
    const rows = Math.ceil(goods.length / perRow);
    graphics
      .roundRect(px + 1, py + TILE_SIZE - inset, TILE_SIZE - 2, 18 + (rows - 1) * 15, 5)
      .fill({ color: COUNTER_BG_COLOR, alpha: 0.85 });
    const slotWidth = (TILE_SIZE - 2) / perRow;
    // Three counters in a row (chata) only fit the tile in a smaller font.
    const counterFont = perRow >= 3 || rows > 1 ? 12 : 14;
    goods.forEach((resource, i) => {
      addLabel(
        `${houseGood(house, resource)}/${houseGoodTarget(house, resource, season)}`,
        px + 1 + slotWidth * (i % perRow) + slotWidth / 2,
        py + TILE_SIZE - inset + 1 + (14 - counterFont) / 2 + Math.floor(i / perRow) * 15,
        RESOURCE_COLOR[resource],
        counterFont,
        0,
      );
    });

    // Firewood gets its own chip in the house's top-left corner. Leftover
    // wood after winter keeps it (without a target) so the drewno never
    // silently disappears from view.
    const firewoodTarget = houseGoodTarget(house, 'drewno', season);
    const firewood = houseGood(house, 'drewno');
    if (firewoodTarget > 0 || firewood > 0) {
      graphics.roundRect(px + 2, py + inset + 2, 30, 17, 5).fill({ color: COUNTER_BG_COLOR, alpha: 0.95 });
      addLabel(
        firewoodTarget > 0 ? `${firewood}/${firewoodTarget}` : String(firewood),
        px + 17,
        py + inset + 3,
        FIREWOOD_TEXT_COLOR,
        13,
        0,
      );
    }

    // Service marker: does this house have the service it needs to grow
    // (studnia for a ziemianka, plac wiecowy for a chata, kontyna for a zagroda)?
    const upgrade = houseTier(house).upgrade;
    if (upgrade && HOUSE_TIERS[house.tier + 1]) {
      const served = upgradeReadiness(state, house).serviceInRange;
      const cx = px + TILE_SIZE - inset - 2;
      const cy = py + inset + 2;
      graphics
        .circle(cx, cy, 7)
        .fill(served ? (SERVICE_ON_COLOR[upgrade.service] ?? 0xffffff) : SERVICE_OFF_COLOR)
        .circle(cx, cy, 7)
        .stroke({ color: 0x1f2a33, width: 2 });
    }

    // Fed and served, but the warehouse lacks a material for the rebuild:
    // a bubble in that material's colour (white rim = "to grow", red rim =
    // hunger/cold) so a stalled house says what it waits for.
    const readiness = upgradeReadiness(state, house);
    if (!house.upgrade && readiness.canGrow && readiness.goodsFull && readiness.serviceInRange) {
      readiness.missingCost.forEach((resource, i) => {
        const cx = px + TILE_SIZE / 2 + i * 18;
        const cy = py + inset - 10;
        graphics
          .circle(cx, cy, 9)
          .fill(RESOURCE_COLOR[resource])
          .circle(cx, cy, 9)
          .stroke({ color: 0xffffff, width: 3 });
      });
    }

    // Hunger (no fish) or cold (no firewood in winter): a bubble in the
    // colour of what is missing, like the one over a waiting villager.
    houseShortages(state, house).forEach((resource, i) => {
      const cx = px + inset + 4 + i * 18;
      const cy = py + inset - 6;
      graphics
        .circle(cx, cy, 8)
        .fill(RESOURCE_COLOR[resource])
        .circle(cx, cy, 8)
        .stroke({ color: NO_ROAD_COLOR, width: 3 });
    });

    if (!isAdjacentToRoad(house.tile, state.roads)) {
      drawNoRoadIcon(graphics, px, py, inset);
    }
    if (house.fire) drawFire(graphics, px, py, house.fire.ticksLeft, house.fire.water, state.tick);

    // Too hungry to work: a red sad face with how many sit inside.
    const strikers = state.villagers.filter(
      (v) => v.job.kind === 'strike' && v.job.houseId === house.id && v.motion !== 'walking',
    ).length;
    if (strikers > 0) {
      const cx = px + TILE_SIZE - inset - 4;
      const cy = py + TILE_SIZE / 2;
      graphics.circle(cx, cy, 13).fill(STRIKE_COLOR).circle(cx, cy, 13).stroke({ color: 0xffffff, width: 2.5 });
      graphics
        .circle(cx - 4, cy - 3, 1.8)
        .fill(0x2b0f08)
        .circle(cx + 4, cy - 3, 1.8)
        .fill(0x2b0f08)
        .arc(cx, cy + 7, 5, Math.PI * 1.15, Math.PI * 1.85)
        .stroke({ color: 0x2b0f08, width: 2 });
      addLabel(String(strikers), cx + 12, cy + 10, 0xffffff, 14);
    }
  }

  /** Zgliszcza: charred beams on ash, a wisp of smoke, the old tier's name in grey. */
  function drawRuins(state: GameState, house: House, px: number, py: number, inset: number, size: number): void {
    graphics.rect(px + inset, py + inset, size, size).fill(ASH_COLOR);
    graphics
      .moveTo(px + inset + 6, py + inset + 10)
      .lineTo(px + TILE_SIZE - inset - 8, py + TILE_SIZE - inset - 6)
      .stroke({ color: CHAR_COLOR, width: 6 })
      .moveTo(px + TILE_SIZE - inset - 6, py + inset + 8)
      .lineTo(px + inset + 10, py + TILE_SIZE - inset - 8)
      .stroke({ color: CHAR_COLOR, width: 6 })
      .rect(px + inset + 4, py + TILE_SIZE - inset - 10, size - 8, 6)
      .fill(CHAR_COLOR);
    for (const [dx, dy] of [[0.3, 0.7], [0.65, 0.35], [0.5, 0.55]]) {
      graphics.circle(px + TILE_SIZE * dx, py + TILE_SIZE * dy, 2.5).fill(EMBER_COLOR);
    }
    const rise = (state.tick % 20) / 20;
    graphics.circle(px + TILE_SIZE * 0.55, py + inset - 2 - rise * 8, 6 + rise * 3).fill({ color: SMOKE_COLOR, alpha: 0.6 - rise * 0.4 });
    addLabel(houseTier(house).name.slice(0, 3), px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0x9a928a, 14);

    if (house.rebuild) {
      const worker = buildersOn(state, { kind: 'rebuild', houseId: house.id }).find((v) => 'stage' in v.job && v.job.stage === 'hammering');
      if (worker && worker.job.kind === 'rebuild' && worker.job.stage === 'hammering') {
        const filled = size * (1 - worker.workTicksRemaining / RUINS_REBUILD.buildTicks);
        graphics.rect(px + inset, py + inset + (size - filled), size, filled).fill({ color: SITE_PROGRESS_COLOR, alpha: 0.7 });
      }
      graphics.rect(px + inset, py + inset, size, size).stroke({ color: SITE_PROGRESS_COLOR, width: 3 });
    } else {
      graphics.rect(px + inset, py + inset, size, size).stroke({ color: CHAR_COLOR, width: 3 });
    }
  }

  return { container, redraw };
}

function drawPlot(graphics: Graphics, px: number, py: number, plot: FieldPlot, plotYield: number): void {
  const pad = 3;
  const size = TILE_SIZE - pad * 2;
  const stage: PlotStage = plot.stage;
  graphics.rect(px + pad, py + pad, size, size).fill(PLOT_COLOR[stage]);
  for (let row = 1; row <= 3; row++) {
    const y = py + pad + (size * row) / 4;
    if (stage === 'zaorane') {
      graphics.rect(px + pad + 4, y - 1, size - 8, 3).fill(FURROW_COLOR);
    } else if (stage === 'kielki') {
      for (let col = 1; col <= 4; col++) {
        graphics.circle(px + pad + (size * col) / 5, y, 3).fill(SPROUT_COLOR);
      }
    } else if (stage === 'lodygi') {
      for (let col = 1; col <= 4; col++) {
        graphics.rect(px + pad + (size * col) / 5 - 2, y - 6, 4, 9).fill(STALK_COLOR);
      }
    } else if (stage === 'dojrzale') {
      // One row of ripe ears per unit still to harvest, so the field
      // visibly empties as the farmer carries the crop away.
      if (row > 3 - Math.min(3, Math.round((plot.yieldLeft / plotYield) * 3))) {
        for (let col = 1; col <= 4; col++) {
          graphics.rect(px + pad + (size * col) / 5 - 2, y - 7, 4, 10).fill(0xb8892a);
        }
      } else {
        for (let col = 1; col <= 4; col++) {
          graphics.rect(px + pad + (size * col) / 5 - 1, y - 2, 3, 4).fill(STUBBLE_COLOR);
        }
      }
    } else {
      for (let col = 1; col <= 4; col++) {
        graphics.rect(px + pad + (size * col) / 5 - 1, y - 2, 3, 4).fill(STUBBLE_COLOR);
      }
    }
  }
}

/**
 * Flames over a burning house, smaller with every bucket poured, and a
 * yellow ring that empties as the time before it burns down runs out.
 */
function drawFire(graphics: Graphics, px: number, py: number, ticksLeft: number, water: number, tick: number): void {
  // Never quite gone while it still burns, so the last bucket still has a fire to hit.
  const strength = Math.max(0.35, 1 - water / STORM.bucketsToDouse);
  const flicker = tick % 4 < 2 ? 1 : 0.85;
  const cx = px + TILE_SIZE / 2;
  const base = py + TILE_SIZE * 0.75;
  for (const [dx, h] of [[-14, 0.8], [0, 1.15], [14, 0.9]]) {
    const height = TILE_SIZE * 1.0 * h * strength * (dx === 0 ? flicker : 2 - flicker);
    const x = cx + dx;
    graphics.poly([x - 12, base, x, base - height, x + 12, base]).fill({ color: FLAME_OUTER, alpha: 0.92 });
    graphics.poly([x - 6, base, x, base - height * 0.6, x + 6, base]).fill(FLAME_INNER);
  }
  // Bucket marks: a blue drop per bucket already poured.
  for (let i = 0; i < water; i++) {
    graphics.circle(px + 10 + i * 12, py + TILE_SIZE - 8, 5).fill(WATER_COLOR).stroke({ color: 0xffffff, width: 1.5 });
  }
  const left = Math.max(0, ticksLeft / STORM.fireTicks);
  const ry = py - 18; // above the tallest flame
  graphics.circle(cx, ry, 12).fill({ color: 0x2b2016, alpha: 0.85 });
  if (left > 0) {
    graphics
      .moveTo(cx, ry)
      .arc(cx, ry, 10, -Math.PI / 2, -Math.PI / 2 + left * Math.PI * 2)
      .lineTo(cx, ry)
      .fill(FIRE_TIMER_COLOR);
  }
  graphics.circle(cx, ry, 12).stroke({ color: FLAME_OUTER, width: 2.5 });
}

/** A little white cow with black patches in the corner of an obora. */
function drawCow(graphics: Graphics, x: number, y: number): void {
  graphics
    .ellipse(x, y, 10, 6)
    .fill(COW_COLOR)
    .stroke({ color: 0x241a0d, width: 1.5 })
    .circle(x + 10, y - 3, 4)
    .fill(COW_COLOR)
    .stroke({ color: 0x241a0d, width: 1.5 })
    .circle(x - 3, y - 1, 2.5)
    .fill(0x241a0d)
    .circle(x + 3, y + 2, 2)
    .fill(0x241a0d);
}

/** A fluffy sheep with a dark head in the corner of an owczarnia. */
function drawSheep(graphics: Graphics, x: number, y: number): void {
  graphics
    .circle(x - 5, y, 5)
    .circle(x + 1, y - 2, 6)
    .circle(x + 5, y + 1, 5)
    .fill(SHEEP_COLOR)
    .stroke({ color: 0x241a0d, width: 1.5 })
    .circle(x + 11, y - 3, 3.5)
    .fill(0x2b2016);
}

/** A strip of snow along the top edge of a building in winter. */
function drawSnowCap(graphics: Graphics, x: number, y: number, width: number): void {
  graphics.roundRect(x - 2, y - 3, width + 4, 9, 4).fill(SNOW_COLOR);
}

function drawNoRoadIcon(graphics: Graphics, px: number, py: number, inset: number): void {
  graphics
    .circle(px + TILE_SIZE / 2, py + inset - 4, 8)
    .fill(NO_ROAD_COLOR)
    .circle(px + TILE_SIZE / 2, py + inset - 4, 8)
    .stroke({ color: 0x5a1a12, width: 2 });
}

/**
 * A paused building, readable at a glance: the whole footprint greyed out
 * under dark diagonal stripes, with a big red pause badge hung on its top
 * edge (where the no-road sign goes) so the building's letter stays readable.
 */
function drawPausedOverlay(graphics: Graphics, px: number, py: number, width: number, height: number, inset: number): void {
  const x0 = px + inset;
  const y0 = py + inset;
  const w = width - inset * 2;
  const h = height - inset * 2;
  graphics.rect(x0, y0, w, h).fill({ color: PAUSED_OVERLAY_COLOR, alpha: 0.6 });
  // Diagonal stripes, clipped to the footprint by hand (Graphics has no clip).
  const gap = 12;
  for (let d = gap; d < w + h; d += gap) {
    const start = { x: x0 + Math.min(d, w), y: y0 + Math.max(0, d - w) };
    const end = { x: x0 + Math.max(0, d - h), y: y0 + Math.min(d, h) };
    graphics.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: PAUSED_STRIPE_COLOR, width: 3, alpha: 0.7 });
  }
  graphics.rect(x0, y0, w, h).stroke({ color: PAUSED_BADGE_COLOR, width: 3 });

  const cx = px + width / 2;
  const cy = py + inset - 2;
  const radius = 15;
  graphics
    .circle(cx, cy, radius)
    .fill(PAUSED_BADGE_COLOR)
    .circle(cx, cy, radius)
    .stroke({ color: PAUSED_ICON_COLOR, width: 3 });
  const barWidth = 5;
  const barHeight = 14;
  const barGap = 4;
  graphics
    .rect(cx - barGap / 2 - barWidth, cy - barHeight / 2, barWidth, barHeight)
    .fill(PAUSED_ICON_COLOR)
    .rect(cx + barGap / 2, cy - barHeight / 2, barWidth, barHeight)
    .fill(PAUSED_ICON_COLOR);
}
