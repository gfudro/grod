import { BUILDINGS, BUILDING_ORDER, type BuildingType } from '../data/buildings';
import { MAP_HEIGHT, MAP_WIDTH, TERRAIN } from '../data/map';
import { TUTORIAL_STEPS } from '../data/tutorial';
import { tileKey, type Vec2 } from '../data/types';
import { WAREHOUSE_TILE } from '../data/waypoints';
import { footprintTiles } from './footprint';
import { inServiceRange } from './houses';
import { canPlaceBuildingAt } from './placement';
import { findResourceTile, manhattan } from './resource-tiles';
import type { GameState } from './state';

/** What the tutorial points at right now. */
export type TutorialHint =
  | { kind: 'build'; type: BuildingType; tile: Vec2 | null }
  /** `type` is the unconnected building the road must reach; absent for the road to the map edge. */
  | { kind: 'road'; tile: Vec2; type?: BuildingType };

export function tutorialDone(state: GameState): boolean {
  return state.tutorialStep >= TUTORIAL_STEPS.length;
}

function hasPlaced(state: GameState, type: BuildingType): boolean {
  if (type === 'ziemianka' && state.houses.length > 0) return true;
  return state.sites.some((s) => s.type === type) || state.buildings.some((b) => b.type === type);
}

/** Moves past every step whose building is already placed. Steps never go back. */
export function advanceTutorial(state: GameState): void {
  while (!tutorialDone(state) && hasPlaced(state, TUTORIAL_STEPS[state.tutorialStep])) {
    state.tutorialStep += 1;
  }
}

/** Dad's shortcut (KRONIKA → SAMOUCZEK): every building at once, no more hints. */
export function skipTutorial(state: GameState): void {
  state.tutorialStep = TUTORIAL_STEPS.length;
}

/** Buildings shown in the palette: every one after the tutorial, else those reached so far. */
export function unlockedBuildings(state: GameState): Set<BuildingType> {
  if (tutorialDone(state)) return new Set(BUILDING_ORDER);
  return new Set(TUTORIAL_STEPS.slice(0, state.tutorialStep + 1));
}

const NEIGHBOR_OFFSETS: Vec2[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

function neighbors(tile: Vec2): Vec2[] {
  return NEIGHBOR_OFFSETS.map((d) => ({ x: tile.x + d.x, y: tile.y + d.y }));
}

/** Every road tile joined (through other roads) to a road beside the warehouse. */
export function warehouseRoadNetwork(state: GameState): Set<string> {
  const network = new Set<string>();
  const queue = neighbors(WAREHOUSE_TILE).filter((t) => state.roads.has(tileKey(t)));
  for (const t of queue) network.add(tileKey(t));
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const next of neighbors(current)) {
      const key = tileKey(next);
      if (state.roads.has(key) && !network.has(key)) {
        network.add(key);
        queue.push(next);
      }
    }
  }
  return network;
}

function touchesNetwork(tiles: Vec2[], network: ReadonlySet<string>): boolean {
  return tiles.some((t) => neighbors(t).some((n) => network.has(tileKey(n))));
}

function isEdge(tile: Vec2): boolean {
  return tile.x === 0 || tile.y === 0 || tile.x === MAP_WIDTH - 1 || tile.y === MAP_HEIGHT - 1;
}

function isGrass(tile: Vec2): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < MAP_WIDTH && tile.y < MAP_HEIGHT && TERRAIN[tile.y][tile.x] === 'trawa';
}

/** Settlers walk in from a grass tile on the map edge that sits on, or next to, the road network. */
function networkReachesEdge(network: ReadonlySet<string>): boolean {
  for (const key of network) {
    const [x, y] = key.split(',').map(Number);
    const tile = { x, y };
    if (isEdge(tile)) return true;
    if (neighbors(tile).some((n) => isEdge(n) && isGrass(n))) return true;
  }
  return false;
}

/** The grass tile on the map edge closest to the warehouse: where the road out should go. */
function nearestEdgeTile(): Vec2 {
  let best: Vec2 = { x: WAREHOUSE_TILE.x, y: MAP_HEIGHT - 1 };
  let bestDist = Infinity;
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = { x, y };
      if (!isEdge(tile) || !isGrass(tile)) continue;
      const dist = manhattan(tile, WAREHOUSE_TILE);
      if (dist < bestDist) {
        bestDist = dist;
        best = tile;
      }
    }
  }
  return best;
}

/** The tree or water a producer's worker walks to; null when it gathers on the spot. */
function gatherTile(type: BuildingType, tile: Vec2): Vec2 | null {
  const search = BUILDINGS[type].resourceSearch;
  if (!search || search === 'na-miejscu') return null;
  return findResourceTile(tile, search);
}

/**
 * A good free spot for the next building: the placeable tile with the
 * shortest roads to build — to the warehouse and, for a drwal or rybak,
 * on to its trees or water. A studnia goes where it reaches a house.
 * The warehouse's own sides stay free for roads.
 */
export function suggestTile(state: GameState, type: BuildingType): Vec2 | null {
  const range = BUILDINGS[type].serviceRange;
  if (range !== undefined && state.houses.length > 0) {
    const servesHouse = (tile: Vec2) => state.houses.some((h) => inServiceRange(tile, range, h.tile));
    const tile = bestTile(state, type, servesHouse);
    if (tile) return tile;
  }
  return bestTile(state, type, () => true);
}

function bestTile(state: GameState, type: BuildingType, allowed: (tile: Vec2) => boolean): Vec2 | null {
  const besideWarehouse = new Set(neighbors(WAREHOUSE_TILE).map(tileKey));
  let best: Vec2 | null = null;
  let bestDist = Infinity;
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = { x, y };
      const gather = gatherTile(type, tile);
      const dist = manhattan(tile, WAREHOUSE_TILE) + (gather ? manhattan(tile, gather) : 0);
      if (dist >= bestDist || !allowed(tile)) continue;
      if (footprintTiles(type, tile).some((t) => besideWarehouse.has(tileKey(t)))) continue;
      if (!canPlaceBuildingAt(state, type, tile)) continue;
      best = tile;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * The single next thing to do, or null once the tutorial is over:
 * first join every placed building to the warehouse by road (and lead
 * it on to the drwal's trees and the rybak's water), then (once
 * a house stands) lead a road to the map edge for settlers, and only
 * then place the next building.
 */
export function tutorialHint(state: GameState): TutorialHint | null {
  if (tutorialDone(state)) return null;

  const network = warehouseRoadNetwork(state);
  const placed: { type: BuildingType; tile: Vec2 }[] = [
    ...state.sites,
    ...state.buildings,
    ...state.houses.map((h) => ({ type: 'ziemianka' as const, tile: h.tile })),
  ];
  for (const p of placed) {
    if (!touchesNetwork(footprintTiles(p.type, p.tile), network)) {
      return { kind: 'road', tile: p.tile, type: p.type };
    }
    // Workers walk only on roads, so the road must go on to the trees or water too.
    const gather = gatherTile(p.type, p.tile);
    if (gather && !touchesNetwork([gather], network)) {
      return { kind: 'road', tile: gather };
    }
  }

  if (state.houses.length > 0 && !networkReachesEdge(network)) {
    return { kind: 'road', tile: nearestEdgeTile() };
  }

  const type = TUTORIAL_STEPS[state.tutorialStep];
  return { kind: 'build', type, tile: suggestTile(state, type) };
}

/** The footprint size the map marker should outline. */
export function hintSize(hint: TutorialHint): { w: number; h: number } {
  return hint.type ? (BUILDINGS[hint.type].footprint ?? { w: 1, h: 1 }) : { w: 1, h: 1 };
}
