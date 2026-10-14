import { BUILDINGS } from '../data/buildings';
import { FIREWOOD, HOUSE_TIERS } from '../data/houses';
import type { ResourceType } from '../data/resources';
import { SEASONS, SEASON_ORDER, SEASON_TICKS, TICKS_PER_DAY, type Season } from '../data/seasons';
import { houseGood, warehouseAmount, type GameState, type House } from './state';

export function seasonAt(tick: number): Season {
  return SEASON_ORDER[Math.floor(tick / SEASON_TICKS) % SEASON_ORDER.length];
}

export function currentSeason(state: GameState): Season {
  return seasonAt(state.tick);
}

/** Years count from 1, starting in spring. */
export function currentYear(state: GameState): number {
  return Math.floor(state.tick / (SEASON_TICKS * SEASON_ORDER.length)) + 1;
}

/** 0..1 — how far through the current season we are. */
export function seasonProgress(state: GameState): number {
  return (state.tick % SEASON_TICKS) / SEASON_TICKS;
}

/** Whole days left until winter starts (0 during winter itself). */
export function daysUntilWinter(state: GameState): number {
  const yearTicks = SEASON_TICKS * SEASON_ORDER.length;
  const winterStart = SEASON_ORDER.indexOf('zima') * SEASON_TICKS;
  const intoYear = state.tick % yearTicks;
  if (intoYear >= winterStart) return 0;
  return Math.ceil((winterStart - intoYear) / TICKS_PER_DAY);
}

/**
 * Runs once on the first tick of each season. Fields follow the calendar:
 * sprouts sown in spring grow stalks in summer and ripen in autumn.
 */
export function startSeason(state: GameState, season: Season): void {
  for (const building of state.buildings) {
    if (!building.plots) continue;
    const plotYield = BUILDINGS[building.type].plotYield ?? 1;
    for (const plot of building.plots) {
      if (season === 'lato' && plot.stage === 'kielki') {
        plot.stage = 'lodygi';
      } else if (season === 'jesien' && (plot.stage === 'kielki' || plot.stage === 'lodygi')) {
        plot.stage = 'dojrzale';
        plot.yieldLeft = plotYield;
      }
    }
  }
}

/** Occupied houses eat their goods, and burn firewood in winter, on a fixed beat. */
export function consumeHouseGoods(state: GameState): void {
  const burns = SEASONS[currentSeason(state)].burnsFirewood;
  for (const house of state.houses) {
    if (house.residents === 0) continue;
    const eatsEvery = HOUSE_TIERS[house.tier].eatsEvery;
    for (const [resource, every] of Object.entries(eatsEvery) as [ResourceType, number][]) {
      if (state.tick % every === 0) eatOne(house, resource);
    }
    if (burns && state.tick % FIREWOOD.burnEvery === 0) eatOne(house, 'drewno');
  }
}

function eatOne(house: House, resource: ResourceType): void {
  const have = houseGood(house, resource);
  if (have > 0) house.goods[resource] = have - 1;
}

/**
 * What an occupied house is missing right now: no fish (hunger) or, in
 * winter, no firewood (cold). Shown over the house; blocks new settlers.
 */
export function houseShortages(state: GameState, house: House): ResourceType[] {
  if (house.residents === 0) return [];
  const missing: ResourceType[] = [];
  if (houseGood(house, 'ryba') === 0) missing.push('ryba');
  if (SEASONS[currentSeason(state)].burnsFirewood && houseGood(house, 'drewno') === 0) missing.push('drewno');
  return missing;
}

/**
 * Goods the village has too little of to get through the next winter:
 * stock in the warehouse plus what houses already hold, against what
 * occupied houses will eat and burn over one winter.
 */
export function winterShortfall(state: GameState): ResourceType[] {
  const need: Partial<Record<ResourceType, number>> = {};
  for (const house of state.houses) {
    if (house.residents === 0) continue;
    const fishEvery = HOUSE_TIERS[house.tier].eatsEvery.ryba;
    if (fishEvery) need.ryba = (need.ryba ?? 0) + Math.ceil(SEASON_TICKS / fishEvery);
    need.drewno = (need.drewno ?? 0) + Math.ceil(SEASON_TICKS / FIREWOOD.burnEvery);
  }
  return (Object.entries(need) as [ResourceType, number][])
    .filter(([resource, amount]) => {
      const held = state.houses.reduce((sum, h) => sum + houseGood(h, resource), 0);
      return warehouseAmount(state, resource) + held < amount;
    })
    .map(([resource]) => resource);
}

/** The pre-winter warning: shown through autumn while stores fall short. */
export function winterWarning(state: GameState): { days: number; missing: ResourceType[] } | null {
  if (currentSeason(state) !== 'jesien') return null;
  const missing = winterShortfall(state);
  return missing.length > 0 ? { days: daysUntilWinter(state), missing } : null;
}
