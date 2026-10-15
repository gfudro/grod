import type { BuildingType } from './buildings';
import type { ResourceAmounts } from './resources';

export interface HouseUpgradeDef {
  /** Paid from the warehouse the moment the upgrade starts, like a construction site. */
  cost: ResourceAmounts;
  /** Ticks a builder hammers once all materials are on site. */
  buildTicks: number;
  /** A building of this type must stand (road-connected) within its service range. */
  service: BuildingType;
}

export interface HouseTierDef {
  name: string;
  capacity: number;
  /**
   * Goods tragarze keep topping this house up to. A tier also wants the
   * goods its next tier needs, so the counter over the house shows what
   * it takes to grow.
   */
  goods: ResourceAmounts;
  /**
   * Ticks between meals, per good: an occupied house eats one unit of
   * that good every so often (the counter visibly drops, e.g. 5/5 → 4/5).
   */
  eatsEvery: ResourceAmounts;
  /** How this house grows into the next tier; absent on the top tier. */
  upgrade?: HouseUpgradeDef;
}

/**
 * House tiers of the needs pyramid (GDD "Piramida potrzeb"). A house only
 * ever moves up: unmet needs stop growth but never demote it.
 */
export const HOUSE_TIERS: HouseTierDef[] = [
  {
    name: 'ZIEMIANKA',
    capacity: 3,
    goods: { ryba: 5, kasza: 3 },
    // Kasza here is only what it takes to grow — a ziemianka doesn't eat it.
    eatsEvery: { ryba: 300 },
    upgrade: { cost: { drewno: 3, glina: 2 }, buildTicks: 40, service: 'studnia' },
  },
  {
    name: 'CHATA',
    capacity: 5,
    goods: { ryba: 5, kasza: 3, ser: 3 },
    // Ser here is only what it takes to grow — a chata doesn't eat it.
    eatsEvery: { ryba: 300, kasza: 600 },
    upgrade: { cost: { drewno: 4, glina: 3 }, buildTicks: 50, service: 'plac' },
  },
  {
    name: 'ZAGRODA',
    capacity: 8,
    goods: { ryba: 5, kasza: 3, ser: 3, ubrania: 3 },
    // Ubrania here are only what it takes to grow — a zagroda doesn't wear them out.
    eatsEvery: { ryba: 300, kasza: 600, ser: 600 },
    upgrade: { cost: { drewno: 5, glina: 4 }, buildTicks: 60, service: 'kontyna' },
  },
  {
    name: 'DWÓR',
    capacity: 12,
    goods: { ryba: 5, kasza: 3, ser: 3, ubrania: 3 },
    // Clothes wear out slower than food is eaten.
    eatsEvery: { ryba: 300, kasza: 600, ser: 600, ubrania: 900 },
  },
];

/**
 * Firewood (opał): from autumn on, tragarze stack drewno at every house up
 * to `target`; in winter an occupied house burns one every `burnEvery` ticks.
 */
export const FIREWOOD = {
  target: 4,
  burnEvery: 450,
} as const;
