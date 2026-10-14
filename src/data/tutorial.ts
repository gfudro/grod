import type { BuildingType } from './buildings';

/**
 * The first spring's tutorial (GDD "Pierwsza wiosna jako samouczek"):
 * one building per step, in this order. A step is done the moment its
 * building is placed. The pole comes early because sowing only happens
 * in spring. Buttons for later steps stay hidden until their step comes.
 */
export const TUTORIAL_STEPS: BuildingType[] = ['drwal', 'rybak', 'ziemianka', 'pole', 'glinianka', 'zarna', 'studnia'];
