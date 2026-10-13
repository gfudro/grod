import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS, type BuildingType } from '../data/buildings';
import { HOUSE_TIERS } from '../data/houses';
import { RESOURCE_COLOR } from '../data/resources';
import { TILE_SIZE } from '../data/tiles';
import { footprintTiles, footprintTouchesRoad } from '../sim/footprint';
import { houseGoodTarget, houseTier, houseWantedGoods, upgradeReadiness } from '../sim/houses';
import { isAdjacentToRoad } from '../sim/pathfinding';
import { houseGood, type GameState, type House, type PlotStage } from '../sim/state';

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
};
/** Body colour per house tier (HOUSE_TIERS index). */
const HOUSE_TIER_COLOR = [0x8a6a42, 0xb48a52];
const ROOF_COLOR = 0xc9a24a;
const PLOT_COLOR: Record<PlotStage, number> = {
  zaorane: 0x7a5530,
  kielki: 0x7a5530,
  dojrzale: 0xe0b84a,
  sciete: 0xc8b27a,
};
const SPROUT_COLOR = 0x7fc04a;
const STUBBLE_COLOR = 0x9a8350;
const FURROW_COLOR = 0x5e3f22;
const NO_ROAD_COLOR = 0xcc4433;
const PAUSED_OVERLAY_COLOR = 0x2b2016;
const PAUSED_ICON_COLOR = 0xf4e9d8;
const WELL_ON_COLOR = 0x4f9fd8;
const WELL_OFF_COLOR = 0x6b6258;
const COUNTER_BG_COLOR = 0x2b2016;

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

      const worker = state.villagers.find((v) => v.id === site.assignedWorkerId);
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
        building.plots.forEach((plot, i) => drawPlot(graphics, tiles[i].x * TILE_SIZE, tiles[i].y * TILE_SIZE, plot.stage));
        const { w, h } = footprintSize(building.type);
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
        addLabel(def.name[0], px + TILE_SIZE / 2, py + TILE_SIZE / 2, 0xf4e9d8, 24);
      }

      if (building.paused) {
        drawPausedOverlay(graphics, px, py, TILE_SIZE - inset * 2, inset);
      } else if (!footprintTouchesRoad(building.type, building.tile, state.roads)) {
        drawNoRoadIcon(graphics, px, py, inset);
      }
    }

    for (const house of state.houses) {
      drawHouse(state, house);
    }
  }

  function drawHouse(state: GameState, house: House): void {
    const { px, py } = tileTopLeft(house.tile.x, house.tile.y);
    const inset = TILE_SIZE * 0.1;
    const size = TILE_SIZE - inset * 2;
    graphics
      .rect(px + inset, py + inset, size, size)
      .fill(HOUSE_TIER_COLOR[house.tier] ?? HOUSE_TIER_COLOR[0])
      .rect(px + inset, py + inset, size, size)
      .stroke({ color: 0x241a0d, width: 3 });
    if (house.tier >= 1) {
      // A chata gets a thatched roof so the growth is visible at a glance.
      graphics
        .poly([px + inset - 3, py + inset + 10, px + TILE_SIZE / 2, py + inset - 8, px + TILE_SIZE - inset + 3, py + inset + 10])
        .fill(ROOF_COLOR)
        .stroke({ color: 0x6b5220, width: 2 });
    }
    addLabel(houseTier(house).name[0], px + TILE_SIZE / 2, py + TILE_SIZE / 2 + 2, 0xf4e9d8, 24);

    if (house.upgrade) {
      // Rebuild in progress: the same rising fill as a construction site.
      const worker = state.villagers.find((v) => v.id === house.upgrade!.assignedWorkerId);
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
    const goods = houseWantedGoods(house);
    const slot = TILE_SIZE / goods.length;
    graphics
      .roundRect(px + 1, py + TILE_SIZE - inset, TILE_SIZE - 2, 18, 5)
      .fill({ color: COUNTER_BG_COLOR, alpha: 0.85 });
    goods.forEach((resource, i) => {
      addLabel(
        `${houseGood(house, resource)}/${houseGoodTarget(house, resource)}`,
        px + slot * i + slot / 2,
        py + TILE_SIZE - inset + 1,
        RESOURCE_COLOR[resource],
        14,
        0,
      );
    });

    // Well marker: does this house have the service it needs to grow?
    const upgrade = houseTier(house).upgrade;
    if (upgrade && HOUSE_TIERS[house.tier + 1]) {
      const served = upgradeReadiness(state, house).serviceInRange;
      const cx = px + TILE_SIZE - inset - 2;
      const cy = py + inset + 2;
      graphics
        .circle(cx, cy, 7)
        .fill(served ? WELL_ON_COLOR : WELL_OFF_COLOR)
        .circle(cx, cy, 7)
        .stroke({ color: 0x1f2a33, width: 2 });
    }

    if (!isAdjacentToRoad(house.tile, state.roads)) {
      drawNoRoadIcon(graphics, px, py, inset);
    }
  }

  return { container, redraw };
}

function drawPlot(graphics: Graphics, px: number, py: number, stage: PlotStage): void {
  const pad = 3;
  const size = TILE_SIZE - pad * 2;
  graphics.rect(px + pad, py + pad, size, size).fill(PLOT_COLOR[stage]);
  for (let row = 1; row <= 3; row++) {
    const y = py + pad + (size * row) / 4;
    if (stage === 'zaorane') {
      graphics.rect(px + pad + 4, y - 1, size - 8, 3).fill(FURROW_COLOR);
    } else if (stage === 'kielki') {
      for (let col = 1; col <= 4; col++) {
        graphics.circle(px + pad + (size * col) / 5, y, 3).fill(SPROUT_COLOR);
      }
    } else if (stage === 'dojrzale') {
      for (let col = 1; col <= 4; col++) {
        graphics.rect(px + pad + (size * col) / 5 - 2, y - 7, 4, 10).fill(0xb8892a);
      }
    } else {
      for (let col = 1; col <= 4; col++) {
        graphics.rect(px + pad + (size * col) / 5 - 1, y - 2, 3, 4).fill(STUBBLE_COLOR);
      }
    }
  }
}

function drawNoRoadIcon(graphics: Graphics, px: number, py: number, inset: number): void {
  graphics
    .circle(px + TILE_SIZE / 2, py + inset - 4, 8)
    .fill(NO_ROAD_COLOR)
    .circle(px + TILE_SIZE / 2, py + inset - 4, 8)
    .stroke({ color: 0x5a1a12, width: 2 });
}

/** Dims a paused building and draws a two-bar pause icon over it. */
function drawPausedOverlay(graphics: Graphics, px: number, py: number, size: number, inset: number): void {
  graphics.rect(px + inset, py + inset, size, size).fill({ color: PAUSED_OVERLAY_COLOR, alpha: 0.55 });
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  const barWidth = 5;
  const barHeight = 18;
  const gap = 5;
  graphics
    .rect(cx - gap / 2 - barWidth, cy - barHeight / 2, barWidth, barHeight)
    .fill(PAUSED_ICON_COLOR)
    .rect(cx + gap / 2, cy - barHeight / 2, barWidth, barHeight)
    .fill(PAUSED_ICON_COLOR);
}
