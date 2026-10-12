import { BUILDINGS } from '../data/buildings';
import type { Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { isAdjacentToRoad } from './pathfinding';
import type { GameState } from './state';

export type InspectInfo =
  | { kind: 'warehouse'; connected: boolean; stock: Partial<Record<string, number>> }
  | { kind: 'site'; name: string; delivered: string; assignedWorkerId: string | null }
  | { kind: 'building'; name: string; connected: boolean; hasWorker: boolean }
  | { kind: 'villager'; description: string };

function atTile(tile: Vec2, target: Vec2): boolean {
  return tile.x === target.x && tile.y === target.y;
}

const JOB_DESCRIPTIONS: Record<string, string> = {
  idle: 'wolny',
  build: 'buduje',
  produce: 'pracuje',
};

export function inspectTile(state: GameState, tile: Vec2): InspectInfo | null {
  const villager = state.villagers.find((v) => atTile(v.from, tile) && v.motion !== 'walking');
  if (villager) {
    return { kind: 'villager', description: JOB_DESCRIPTIONS[villager.job.kind] ?? villager.job.kind };
  }

  if (atTile(tile, WAREHOUSE_TILE)) {
    return { kind: 'warehouse', connected: isAdjacentToRoad(tile, state.roads), stock: { ...state.warehouse } };
  }

  const building = state.buildings.find((b) => atTile(b.tile, tile));
  if (building) {
    return {
      kind: 'building',
      name: BUILDINGS[building.type].name,
      connected: isAdjacentToRoad(building.tile, state.roads),
      hasWorker: building.workerId !== null,
    };
  }

  const site = state.sites.find((s) => atTile(s.tile, tile));
  if (site) {
    const def = BUILDINGS[site.type];
    const have = Object.entries(site.delivered).reduce((sum, [, n]) => sum + (n ?? 0), 0);
    const need = Object.values(def.cost).reduce((sum, n) => sum + (n ?? 0), 0);
    return {
      kind: 'site',
      name: def.name,
      delivered: `${have}/${need}`,
      assignedWorkerId: site.assignedWorkerId,
    };
  }

  return null;
}
