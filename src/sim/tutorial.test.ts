import { describe, expect, it } from 'vitest';
import { BUILDING_ORDER, type BuildingType } from '../data/buildings';
import { FOREST } from '../data/map';
import { canBuildRoadOn } from '../input/road-draw';
import { footprintTiles, occupiedTileKeys } from './footprint';
import { TUTORIAL_STEPS } from '../data/tutorial';
import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { canPlaceBuildingAt, tryPlaceConstructionSite } from './placement';
import { createInitialState, type GameState } from './state';
import { tick } from './tick';
import { advanceTutorial, suggestTile, tutorialDone, tutorialHint, unlockedBuildings, warehouseRoadNetwork } from './tutorial';

function road(state: GameState, from: Vec2, to: Vec2): void {
  // An L-shaped road: along x first, then along y.
  const stepX = Math.sign(to.x - from.x);
  const stepY = Math.sign(to.y - from.y);
  let x = from.x;
  let y = from.y;
  state.roads.add(tileKey({ x, y }));
  while (x !== to.x) {
    x += stepX;
    state.roads.add(tileKey({ x, y }));
  }
  while (y !== to.y) {
    y += stepY;
    state.roads.add(tileKey({ x, y }));
  }
}

/** Like Artur following a DROGA hint: the shortest free road from beside `target` to the warehouse's roads. */
function connect(state: GameState, target: { tile: Vec2; type?: BuildingType }): void {
  const blocked = occupiedTileKeys(state);
  for (const tree of FOREST) blocked.add(tileKey(tree));
  const free = (t: Vec2) => canBuildRoadOn(t) && !blocked.has(tileKey(t));
  const near = (t: Vec2) => [
    { x: t.x + 1, y: t.y },
    { x: t.x - 1, y: t.y },
    { x: t.x, y: t.y + 1 },
    { x: t.x, y: t.y - 1 },
  ];
  const goal = new Set([...warehouseRoadNetwork(state), ...near(WAREHOUSE_TILE).map(tileKey)]);
  const footprint = target.type ? footprintTiles(target.type, target.tile) : [target.tile];
  const queue = footprint.flatMap(near).filter(free);
  const cameFrom = new Map<string, string | null>(queue.map((t) => [tileKey(t), null]));
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (goal.has(tileKey(current))) {
      for (let k: string | null = tileKey(current); k; k = cameFrom.get(k) ?? null) state.roads.add(k);
      return;
    }
    for (const next of near(current)) {
      if (free(next) && !cameFrom.has(tileKey(next))) {
        cameFrom.set(tileKey(next), tileKey(current));
        queue.push(next);
      }
    }
  }
  throw new Error(`no road possible to ${tileKey(target.tile)}`);
}

describe('first-spring tutorial', () => {
  it('starts at the drwal with only its button shown, and points at a placeable tile', () => {
    const state = createInitialState();
    expect(state.tutorialStep).toBe(0);
    expect([...unlockedBuildings(state)]).toEqual(['drwal']);
    const hint = tutorialHint(state);
    expect(hint?.kind).toBe('build');
    if (hint?.kind !== 'build') return;
    expect(hint.type).toBe('drwal');
    expect(hint.tile).not.toBeNull();
    expect(canPlaceBuildingAt(state, 'drwal', hint.tile!)).toBe(true);
  });

  it('asks for a road to a placed building that is not joined to the warehouse', () => {
    const state = createInitialState();
    const tile = suggestTile(state, 'drwal')!;
    expect(tryPlaceConstructionSite(state, 'drwal', tile)).toBe(true);
    advanceTutorial(state);
    expect(state.tutorialStep).toBe(1);
    expect(tutorialHint(state)).toMatchObject({ kind: 'road', tile, type: 'drwal' });

    // A road touching the drwal but not the warehouse is still not enough.
    state.roads.add(tileKey({ x: tile.x, y: tile.y + 1 }));
    expect(tutorialHint(state)?.kind).toBe('road');

    connect(state, { tile, type: 'drwal' });
    // Joined to the warehouse, but the drwal's worker can't reach a tree yet.
    const toTree = tutorialHint(state);
    if (toTree?.kind !== 'road') throw new Error('expected a road hint');
    expect(FOREST.some((t) => t.x === toTree.tile.x && t.y === toTree.tile.y)).toBe(true);

    connect(state, toTree);
    expect(tutorialHint(state)).toMatchObject({ kind: 'build', type: 'rybak' });
    expect(unlockedBuildings(state)).toEqual(new Set(['drwal', 'rybak']));
  });

  it('after the first house, asks for a road to the map edge', () => {
    const state = createInitialState();
    state.warehouse.drewno = 50;
    state.tutorialStep = 2;
    const tile = suggestTile(state, 'ziemianka')!;
    tryPlaceConstructionSite(state, 'ziemianka', tile);
    connect(state, { tile, type: 'ziemianka' });
    advanceTutorial(state);
    // Still a site: no settlers needed yet, so the pole comes next.
    expect(tutorialHint(state)).toMatchObject({ kind: 'build', type: 'pole' });

    for (let i = 0; i < 3000 && state.houses.length === 0; i++) tick(state);
    expect(state.houses).toHaveLength(1);
    const hint = tutorialHint(state);
    if (hint?.kind !== 'road') throw new Error('expected a road hint');
    expect(hint.tile.y).toBe(13); // the bottom edge, straight down from the warehouse

    road(state, { x: WAREHOUSE_TILE.x, y: WAREHOUSE_TILE.y + 1 }, hint.tile);
    expect(tutorialHint(state)).toMatchObject({ kind: 'build', type: 'pole' });
  });

  it('puts the studnia where it reaches the first house', () => {
    const state = createInitialState();
    state.warehouse = { drewno: 50, glina: 50 };
    state.houses.push({ id: 'dom-1', tile: { x: 4, y: 11 }, tier: 0, residents: 0, goods: {}, upgrade: null });
    const tile = suggestTile(state, 'studnia')!;
    expect(Math.max(Math.abs(tile.x - 4), Math.abs(tile.y - 11))).toBeLessThanOrEqual(3);
  });

  it('ends after the last step, then shows every building and no hint', () => {
    const state = createInitialState();
    state.tutorialStep = TUTORIAL_STEPS.length - 1;
    state.warehouse = { drewno: 50, glina: 50 };
    tryPlaceConstructionSite(state, 'studnia', suggestTile(state, 'studnia')!);
    tick(state);
    expect(tutorialDone(state)).toBe(true);
    expect(tutorialHint(state)).toBeNull();
    expect(unlockedBuildings(state)).toEqual(new Set(BUILDING_ORDER));
  });

  it('walks the whole tutorial when every hint is followed', () => {
    const state = createInitialState();
    state.warehouse = { drewno: 200, glina: 200 };
    for (let guard = 0; guard < 40 && !tutorialDone(state); guard++) {
      const hint = tutorialHint(state)!;
      if (hint.kind === 'build') {
        expect(unlockedBuildings(state).has(hint.type)).toBe(true);
        expect(tryPlaceConstructionSite(state, hint.type, hint.tile!)).toBe(true);
      } else {
        connect(state, hint);
      }
      for (let i = 0; i < 600; i++) tick(state);
    }
    expect(tutorialDone(state)).toBe(true);
  });
});
