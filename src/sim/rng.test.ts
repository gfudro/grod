import { describe, expect, it } from 'vitest';
import { createRng, nextFloat, nextInt } from './rng';

describe('rng', () => {
  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [nextFloat(a), nextFloat(a), nextFloat(a)];
    const seqB = [nextFloat(b), nextFloat(b), nextFloat(b)];
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(nextFloat(a)).not.toEqual(nextFloat(b));
  });

  it('nextInt stays within [0, max)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i++) {
      const value = nextInt(rng, 5);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(5);
    }
  });
});
