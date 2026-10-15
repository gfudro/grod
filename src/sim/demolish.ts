import { BUILDINGS } from '../data/buildings';
import { HOUSE_TIERS } from '../data/houses';
import type { ResourceAmounts, ResourceType } from '../data/resources';
import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { footprintTiles } from './footprint';
import { findPath } from './pathfinding';
import { RUINS_REBUILD } from '../data/storms';
import { addToWarehouse, type GameState, type House, type VillagerJob, type VillagerState } from './state';

function refund(state: GameState, amounts: ResourceAmounts): void {
  for (const [resource, amount] of Object.entries(amounts) as [ResourceType, number][]) {
    if (amount > 0) addToWarehouse(state, resource, amount);
  }
}

/**
 * Sends villagers working on the demolished thing back to the free pool.
 * Whatever they hold stays in their hands: an idle villager carries it
 * back to the warehouse on foot (see runIdle), so nothing vanishes.
 * `footprint` is the demolished ground: anyone standing on it (a farmer
 * in the middle of a field) first walks off it, while it still counts as
 * walkable, so nobody is left stranded off the roads.
 */
function releaseWorkers(
  state: GameState,
  worksOnIt: (job: VillagerJob) => boolean,
  footprint: Vec2[] = [],
): VillagerState[] {
  const ground = new Set(footprint.map(tileKey));
  const released = state.villagers.filter((v) => worksOnIt(v.job));
  for (const v of released) {
    v.job = { kind: 'idle' };
    if (v.motion === 'walking') {
      v.path = [v.to]; // finish the step under way, then head home
      continue;
    }
    v.motion = 'idle';
    if (!ground.has(tileKey(v.from))) continue;
    const path = findPath(new Set([...state.roads, ...ground]), v.from, WAREHOUSE_TILE);
    if (path && path.length > 0) {
      v.path = path;
      v.to = path[0];
      v.segmentTicks = 0;
      v.motion = 'walking';
    }
  }
  return released;
}

/** Paid-for materials not yet on site — minus the units builders are carrying back by hand. */
function unspent(cost: ResourceAmounts, carriedBack: VillagerState[]): ResourceAmounts {
  const left: ResourceAmounts = { ...cost };
  for (const v of carriedBack) {
    if (v.carrying && (left[v.carrying] ?? 0) > 0) left[v.carrying] = left[v.carrying]! - 1;
  }
  return left;
}

/**
 * Calls off a house's rebuild into the next tier: its builder goes back
 * to the pool and every paid-for material returns to the warehouse.
 */
export function cancelHouseUpgrade(state: GameState, house: House): void {
  if (!house.upgrade) return;
  const upgraders = releaseWorkers(state, (j) => j.kind === 'upgrade' && j.houseId === house.id, [house.tile]);
  refund(state, unspent(HOUSE_TIERS[house.tier].upgrade?.cost ?? {}, upgraders));
  house.upgrade = null;
}

/** The id ZBURZ uses for the kopiec — there is only ever one. */
export const MOUND_ID = 'kopiec';

/**
 * Pulls down a construction site, building, house or an unfinished
 * kopiec (never the warehouse, never a finished kopiec).
 * Light punishment (CLAUDE.md rule 3): every material comes back to the
 * warehouse, nobody leaves the gród, the land is free to build on again.
 */
export function demolish(state: GameState, id: string): boolean {
  const site = state.sites.find((s) => s.id === id);
  if (site) {
    // The full cost was paid when the site was placed; part of it may already lie on site.
    const builders = releaseWorkers(
      state,
      (j) => j.kind === 'build' && j.siteId === id,
      footprintTiles(site.type, site.tile),
    );
    refund(state, unspent(BUILDINGS[site.type].cost, builders));
    state.sites = state.sites.filter((s) => s !== site);
    return true;
  }

  const building = state.buildings.find((b) => b.id === id);
  if (building) {
    releaseWorkers(state, (j) => 'buildingId' in j && j.buildingId === id, footprintTiles(building.type, building.tile));
    refund(state, BUILDINGS[building.type].cost);
    state.buildings = state.buildings.filter((b) => b !== building);
    return true;
  }

  if (id === MOUND_ID && state.mound && !state.mound.done) {
    // Builders on their way drop what they carry back at the warehouse
    // (runIdle); what already lies on the mound comes back too.
    const mound = state.mound;
    releaseWorkers(state, (j) => j.kind === 'mound', footprintTiles('kopiec', mound.tile));
    refund(state, mound.delivered);
    state.mound = null;
    return true;
  }

  const house = state.houses.find((h) => h.id === id);
  if (house) {
    if (house.ruined) {
      // What burned is gone; only a paid-for rebuild still comes back.
      const rebuilders = releaseWorkers(state, (j) => j.kind === 'rebuild' && j.houseId === id, [house.tile]);
      if (house.rebuild) refund(state, unspent(RUINS_REBUILD.cost, rebuilders));
    } else {
      refund(state, BUILDINGS.ziemianka.cost);
      for (let tier = 0; tier < house.tier; tier++) refund(state, HOUSE_TIERS[tier].upgrade?.cost ?? {});
    }
    cancelHouseUpgrade(state, house);
    // Fish, kasza and firewood already stocked at the house go back too.
    refund(state, house.goods);
    releaseWorkers(state, (j) => (j.kind === 'deliver' || j.kind === 'douse') && j.houseId === id, [house.tile]);
    // Its residents stay in the gród as free workers, now without a house
    // to go hungry in; settlers on their way in find the house gone and
    // join the pool too (runArriving).
    for (const v of state.villagers) if (v.homeId === id) v.homeId = null;
    state.houses = state.houses.filter((h) => h !== house);
    return true;
  }

  return false;
}
