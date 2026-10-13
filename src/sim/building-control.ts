import type { GameState } from './state';

/**
 * Pausing a production building immediately frees its worker (if any) so
 * the player can redirect them elsewhere — e.g. to finish a stalled
 * construction site. The building itself is untouched; resuming it just
 * makes it eligible for the next idle worker again.
 */
export function setBuildingPaused(state: GameState, buildingId: string, paused: boolean): void {
  const building = state.buildings.find((b) => b.id === buildingId);
  if (!building) return;
  building.paused = paused;

  if (paused && building.workerId) {
    const worker = state.villagers.find((v) => v.id === building.workerId);
    if (worker) {
      worker.job = { kind: 'idle' };
      worker.motion = 'idle';
      worker.carrying = null;
    }
    building.workerId = null;
  }
}
