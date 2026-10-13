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
    upgrade: { cost: { drewno: 3, glina: 2 }, buildTicks: 40, service: 'studnia' },
  },
  {
    name: 'CHATA',
    capacity: 5,
    goods: { ryba: 5, kasza: 3 },
  },
];
