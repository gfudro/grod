import { describe, expect, it } from 'vitest';
import { findPath } from './pathfinding';
import { tileKey } from '../data/types';

describe('findPath', () => {
  it('returns an empty path when start equals goal', () => {
    expect(findPath(new Set(), { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual([]);
  });

  it('returns null when no road connects start and goal', () => {
    const path = findPath(new Set(), { x: 0, y: 0 }, { x: 5, y: 0 });
    expect(path).toBeNull();
  });

  it('finds a straight path along drawn road tiles', () => {
    const roads = new Set([
      tileKey({ x: 1, y: 0 }),
      tileKey({ x: 2, y: 0 }),
      tileKey({ x: 3, y: 0 }),
    ]);
    const path = findPath(roads, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 4, y: 0 },
    ]);
  });

  it('refuses to cut through tiles that are not roads', () => {
    // Road only covers part of the way; the gap at x=2 should block it.
    const roads = new Set([tileKey({ x: 1, y: 0 }), tileKey({ x: 3, y: 0 })]);
    const path = findPath(roads, { x: 0, y: 0 }, { x: 4, y: 0 });
    expect(path).toBeNull();
  });

  it('routes around an obstacle using only road tiles', () => {
    const roads = new Set([
      tileKey({ x: 1, y: 0 }),
      tileKey({ x: 1, y: 1 }),
      tileKey({ x: 1, y: 2 }),
      tileKey({ x: 2, y: 2 }),
    ]);
    const path = findPath(roads, { x: 0, y: 0 }, { x: 2, y: 2 });
    expect(path).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ]);
  });
});
