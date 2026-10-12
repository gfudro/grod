import { Container, Graphics, Text } from 'pixi.js';
import { BUILDINGS } from '../data/buildings';
import { TILE_SIZE } from '../data/tiles';
import { isAdjacentToRoad } from '../sim/pathfinding';
import type { GameState } from '../sim/state';

const SITE_COLOR = 0x9b7a4a;
const SITE_PROGRESS_COLOR = 0xd9b96a;
const BUILDING_COLOR: Record<string, number> = {
  drwal: 0x5c4326,
  rybak: 0x3f5f6b,
  glinianka: 0x9b4a3f,
};
const NO_ROAD_COLOR = 0xcc4433;

export interface BuildingsLayer {
  container: Container;
  redraw(state: GameState): void;
}

function tileTopLeft(x: number, y: number): { px: number; py: number } {
  return { px: x * TILE_SIZE, py: y * TILE_SIZE };
}

export function createBuildingsLayer(): BuildingsLayer {
  const container = new Container();
  const graphics = new Graphics();
  container.addChild(graphics);
  const labels = new Container();
  container.addChild(labels);

  function redraw(state: GameState): void {
    graphics.clear();
    labels.removeChildren();

    const size = TILE_SIZE * 0.8;
    const inset = (TILE_SIZE - size) / 2;

    for (const site of state.sites) {
      const { px, py } = tileTopLeft(site.tile.x, site.tile.y);
      graphics
        .rect(px + inset, py + inset, size, size)
        .fill(SITE_COLOR)
        .rect(px + inset, py + inset, size, size)
        .stroke({ color: 0x3a2b16, width: 2 });

      const worker = state.villagers.find((v) => v.id === site.assignedWorkerId);
      const def = BUILDINGS[site.type];
      let progress = 0;
      if (worker && worker.job.kind === 'build' && worker.job.stage === 'hammering') {
        progress = 1 - worker.workTicksRemaining / def.buildTicks;
      }
      if (progress > 0) {
        const h = size * progress;
        graphics.rect(px + inset, py + inset + (size - h), size, h).fill(SITE_PROGRESS_COLOR);
      }
    }

    for (const building of state.buildings) {
      const { px, py } = tileTopLeft(building.tile.x, building.tile.y);
      const color = BUILDING_COLOR[building.type] ?? 0x555555;
      graphics
        .rect(px + inset, py + inset, size, size)
        .fill(color)
        .rect(px + inset, py + inset, size, size)
        .stroke({ color: 0x241a0d, width: 3 });

      const label = new Text({
        text: BUILDINGS[building.type].name[0],
        style: { fill: 0xf4e9d8, fontSize: 24, fontWeight: 'bold', fontFamily: 'sans-serif' },
      });
      label.anchor.set(0.5);
      label.position.set(px + TILE_SIZE / 2, py + TILE_SIZE / 2);
      labels.addChild(label);

      if (!isAdjacentToRoad(building.tile, state.roads)) {
        graphics
          .circle(px + TILE_SIZE / 2, py + inset - 4, 8)
          .fill(NO_ROAD_COLOR)
          .circle(px + TILE_SIZE / 2, py + inset - 4, 8)
          .stroke({ color: 0x5a1a12, width: 2 });
      }
    }
  }

  return { container, redraw };
}
