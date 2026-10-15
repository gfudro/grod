import { HUNGER } from '../data/hunger';
import { addChronicleEntry } from './chronicle';
import { houseGood, type GameState, type House, type VillagerState } from './state';

/** 0 = fed, 1 = hungry (slower), 2 = sad (red), 3 = stays home doing nothing. */
export type HungerStage = 0 | 1 | 2 | 3;

export function houseHungerStage(house: House): HungerStage {
  const t = house.hungerTicks ?? 0;
  if (t <= 0) return 0;
  if (t >= HUNGER.strikeTicks) return 3;
  if (t >= HUNGER.sadTicks) return 2;
  return 1;
}

/** A villager's hunger is their house's. The starting crew has no house and is never hungry. */
export function hungerStage(state: GameState, villager: VillagerState): HungerStage {
  if (!villager.homeId) return 0;
  const home = state.houses.find((h) => h.id === villager.homeId);
  return home ? houseHungerStage(home) : 0;
}

/**
 * Runs every tick: an occupied house without fish gets hungrier; the
 * first fish delivered ends it at once.
 */
export function advanceHunger(state: GameState): void {
  for (const house of state.houses) {
    const occupied = house.residents > 0 && !house.ruined && !house.fire;
    if (!occupied || houseGood(house, 'ryba') > 0) {
      house.hungerTicks = 0;
      continue;
    }
    house.hungerTicks = (house.hungerTicks ?? 0) + 1;
    if (house.hungerTicks === HUNGER.strikeTicks) addChronicleEntry(state, 'strajk-glodowy', { tier: house.tier });
  }
}

/**
 * Even at the worst of it, whoever brings fish in keeps at it — the
 * rybak and the tragarze carrying fish — so a hungry gród can always
 * feed itself again. (Firefighting goes on too.)
 */
export function keepsWorkingWhenHungry(state: GameState, villager: VillagerState): boolean {
  const job = villager.job;
  if (job.kind === 'deliver') return job.resource === 'ryba';
  if (job.kind === 'douse') return true;
  if (job.kind === 'produce') {
    const building = state.buildings.find((b) => b.id === job.buildingId);
    return building?.type === 'rybak';
  }
  return false;
}

/**
 * Hungry people work slower: this many work ticks out of every
 * `slowMultiplier` count, so a 3 s job takes 4.5 s at stage 1 and above.
 */
export function worksThisTick(state: GameState, villager: VillagerState): boolean {
  if (hungerStage(state, villager) === 0) return true;
  const every = HUNGER.slowMultiplier; // 1.5 → skip one tick in three
  const skipEvery = Math.round(every / (every - 1));
  return state.tick % skipEvery !== 0;
}
