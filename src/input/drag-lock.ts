import type { Viewport } from 'pixi-viewport';

const dragLocks = new WeakMap<Viewport, Set<string>>();

/**
 * Road drawing and building placement each stop one-finger panning while
 * they are on. The map pans again only once *no* mode holds a lock — so
 * leaving one mode can't unlock the map under the other (DROGA used to
 * switch build mode off, which unpaused the drag mid road mode).
 */
export function setMapDragLock(viewport: Viewport, owner: string, locked: boolean): void {
  let owners = dragLocks.get(viewport);
  if (!owners) {
    owners = new Set();
    dragLocks.set(viewport, owners);
  }
  if (locked) owners.add(owner);
  else owners.delete(owner);
  if (owners.size > 0) viewport.plugins.pause('drag');
  else viewport.plugins.resume('drag');
}
