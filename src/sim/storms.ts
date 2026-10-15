import type { ResourceType } from '../data/resources';
import { SEASON_TICKS, TICKS_PER_DAY } from '../data/seasons';
import { RUINS_REBUILD, STORM } from '../data/storms';
import { addChronicleEntry } from './chronicle';
import { cancelHouseUpgrade } from './demolish';
import { findServingBuilding } from './houses';
import { nextInt } from './rng';
import { currentSeason, currentYear } from './seasons';
import { takeFromWarehouse, warehouseAmount, type Building, type GameState, type House, type Storm } from './state';

/** A house that can't be lived in right now: on fire or burned down. */
export function houseOutOfUse(house: House): boolean {
  return Boolean(house.ruined) || Boolean(house.fire);
}

/** The kontyna Peruna that would take a bolt aimed at this house, if any. */
export function protectingKontyna(state: GameState, house: House): Building | null {
  return findServingBuilding(state, 'kontyna', house.tile);
}

/** The studnia whose buckets can reach this house, if any. */
export function servingWell(state: GameState, house: House): Building | null {
  return findServingBuilding(state, 'studnia', house.tile);
}

/**
 * Plans this summer's storms, called on the first tick of summer. They
 * are spread over the season so the clouds come one at a time.
 */
export function planStorms(state: GameState): void {
  if (currentYear(state) < STORM.firstYear) return;
  const { min, max } = STORM.perSummer;
  const count = min + nextInt(state.rng, max - min + 1);
  const slot = Math.floor(SEASON_TICKS / count);
  // The cloud must strike before summer ends, with a day's gap to the next one.
  const slack = Math.max(1, slot - STORM.warningTicks - TICKS_PER_DAY);
  for (let i = 0; i < count; i++) {
    const appearTick = state.tick + slot * i + nextInt(state.rng, slack);
    state.storms.push({ appearTick, strikeTick: appearTick + STORM.warningTicks, houseId: null });
  }
}

/** The storm whose cloud hangs over the gród right now, if any. */
export function activeStorm(state: GameState): Storm | null {
  return state.storms.find((s) => s.houseId !== null) ?? null;
}

/** Whole days until the bolt (shown on the top bar next to the lightning sign). */
export function stormDaysLeft(state: GameState, storm: Storm): number {
  return Math.max(1, Math.ceil((storm.strikeTick - state.tick) / TICKS_PER_DAY));
}

/** Runs every tick: clouds come in, bolts fall, fires burn down or go out. */
export function advanceStorms(state: GameState): void {
  if (currentSeason(state) === 'lato') {
    for (const storm of [...state.storms]) {
      if (storm.houseId === null && state.tick >= storm.appearTick) chooseTarget(state, storm);
      if (storm.houseId !== null && state.tick >= storm.strikeTick) strike(state, storm);
    }
  } else if (state.storms.length > 0) {
    state.storms = []; // anything left over blows away with the summer
  }
  for (const house of state.houses) {
    if (!house.fire) continue;
    house.fire.ticksLeft -= 1;
    if (house.fire.ticksLeft <= 0) burnDown(state, house);
  }
  if (state.lastStrike && state.tick - state.lastStrike.tick > STORM.flashTicks) state.lastStrike = null;
}

function chooseTarget(state: GameState, storm: Storm): void {
  const taken = new Set(state.storms.map((s) => s.houseId));
  const candidates = state.houses.filter((h) => !houseOutOfUse(h) && !taken.has(h.id));
  if (candidates.length === 0) {
    state.storms = state.storms.filter((s) => s !== storm); // nothing to hang over: the storm passes by
    return;
  }
  storm.houseId = candidates[nextInt(state.rng, candidates.length)].id;
  storm.strikeTick = state.tick + STORM.warningTicks;
}

function strike(state: GameState, storm: Storm): void {
  state.storms = state.storms.filter((s) => s !== storm);
  const house = state.houses.find((h) => h.id === storm.houseId);
  if (!house || houseOutOfUse(house)) return; // pulled down meanwhile — the cloud just moves on
  const kontyna = protectingKontyna(state, house);
  if (kontyna) {
    state.lastStrike = { tick: state.tick, tile: { ...kontyna.tile } };
    addChronicleEntry(state, 'piorun-kontyna');
    return;
  }
  state.lastStrike = { tick: state.tick, tile: { ...house.tile } };
  house.fire = { ticksLeft: STORM.fireTicks, water: 0 };
}

/** One bucket poured on the fire; enough of them put it out. */
export function pourWater(state: GameState, house: House): void {
  if (!house.fire) return;
  house.fire.water += 1;
  if (house.fire.water >= STORM.bucketsToDouse) {
    house.fire = null;
    addChronicleEntry(state, 'ugaszony', { tier: house.tier });
  }
}

function burnDown(state: GameState, house: House): void {
  house.fire = null;
  house.ruined = true;
  // A rebuild into the next tier can't go on in ashes: its materials come back.
  cancelHouseUpgrade(state, house);
  addChronicleEntry(state, 'pozar', { tier: house.tier });
}

export function rebuildCostMissing(state: GameState): ResourceType[] {
  return (Object.entries(RUINS_REBUILD.cost) as [ResourceType, number][])
    .filter(([resource, amount]) => warehouseAmount(state, resource) < amount)
    .map(([resource]) => resource);
}

/** ODBUDUJ: pays for the rebuild now; a free villager carries it over and hammers. */
export function startRebuild(state: GameState, houseId: string): boolean {
  const house = state.houses.find((h) => h.id === houseId);
  if (!house || !house.ruined || house.rebuild) return false;
  if (rebuildCostMissing(state).length > 0) return false;
  for (const [resource, amount] of Object.entries(RUINS_REBUILD.cost) as [ResourceType, number][]) {
    takeFromWarehouse(state, resource, amount);
  }
  house.rebuild = { delivered: {}, assignedWorkerId: null };
  return true;
}

export function completeRebuild(state: GameState, house: House): void {
  house.ruined = false;
  house.rebuild = null;
  addChronicleEntry(state, 'odbudowa', { tier: house.tier });
}
