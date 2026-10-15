import type { ResourceAmounts, ResourceType } from '../data/resources';
import type { GameState, VillagerJob, VillagerState } from './state';

/**
 * Up to this many free villagers carry materials to one construction
 * site, house rebuild or ruin at once (Greg, 2026-10-15: with the higher
 * costs, one builder made every building a long wait).
 */
export const MAX_BUILDERS = 3;

/** Something being built: a site, a house growing a tier, or ruins after ODBUDUJ. */
export type ConstructionRef =
  | { kind: 'build'; siteId: string }
  | { kind: 'upgrade'; houseId: string }
  | { kind: 'rebuild'; houseId: string };

export function worksOn(job: VillagerJob, ref: ConstructionRef): boolean {
  if (job.kind !== ref.kind) return false;
  if (job.kind === 'build') return ref.kind === 'build' && job.siteId === ref.siteId;
  return 'houseId' in job && 'houseId' in ref && job.houseId === ref.houseId;
}

export function buildersOn(state: GameState, ref: ConstructionRef): VillagerState[] {
  return state.villagers.filter((v) => worksOn(v.job, ref));
}

function unitsLeft(cost: ResourceAmounts, delivered: ResourceAmounts): number {
  return (Object.entries(cost) as [ResourceType, number][]).reduce(
    (sum, [resource, amount]) => sum + Math.max(0, amount - (delivered[resource] ?? 0)),
    0,
  );
}

/**
 * Another builder is welcome while there is a unit nobody has claimed
 * yet (each builder on it carries, or is about to carry, one unit), or
 * when everything is on site and nobody is there to hammer.
 */
export function wantsBuilder(state: GameState, ref: ConstructionRef, cost: ResourceAmounts, delivered: ResourceAmounts): boolean {
  const builders = buildersOn(state, ref).length;
  if (builders >= MAX_BUILDERS) return false;
  const left = unitsLeft(cost, delivered);
  return left > builders || (left === 0 && builders === 0);
}

/** The next material to carry over: still missing on site and not already in another builder's hands. */
export function nextToCarry(cost: ResourceAmounts, delivered: ResourceAmounts, others: VillagerState[]): ResourceType | null {
  for (const [resource, amount] of Object.entries(cost) as [ResourceType, number][]) {
    const onTheWay = others.filter((v) => v.carrying === resource).length;
    if ((delivered[resource] ?? 0) + onTheWay < amount) return resource;
  }
  return null;
}
