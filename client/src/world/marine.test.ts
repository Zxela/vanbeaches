import { describe, expect, it } from 'vitest';
import { atlasSampler } from './crowd/zones';
import { connectionSampler } from './marine';

function pixels(heights: number[]) {
  return new Uint8ClampedArray(
    heights.flatMap((height) => {
      const encoded = Math.round((height + 512) * 100);
      return [encoded >> 8, encoded & 255, 0, 255];
    }),
  );
}

describe('marine sill sampling', () => {
  it('never averages a dry sill into adjacent deep water', () => {
    const data = pixels([0.22, -8, -8, -8]);
    const bounds = [0, 0, 20, 20];
    const interpolated = atlasSampler(data, 2, 2, bounds)(7.5, 7.5);
    const conservative = connectionSampler(data, 2, 2, bounds)(7.5, 7.5);
    expect(interpolated).toBeLessThan(0);
    expect(conservative).toBeCloseTo(0.22);
    // At tide 0 the nearest GPU texel is the +0.22m sill, so navigation must refuse it.
    expect(conservative !== null && 0 > conservative).toBe(false);
  });
  it('keeps unknown neighbouring pixels and outside coverage impassable', () => {
    const data = pixels([-8, -8, -8, -8]);
    data[15] = 0;
    const sample = connectionSampler(data, 2, 2, [0, 0, 20, 20]);
    expect(sample(7.5, 7.5)).toBeNull();
    expect(sample(-1, 5)).toBeNull();
  });
  it('preserves a fully surveyed deep water corridor', () => {
    expect(connectionSampler(pixels([-12, -8, -10, -11]), 2, 2, [0, 0, 20, 20])(7.5, 7.5)).toBe(-8);
  });
  it('never navigates through a mapped sea surface without surveyed depth', () => {
    const data = pixels([-8, -8, -8, -512]);
    data[14] = 255;
    expect(connectionSampler(data, 2, 2, [0, 0, 20, 20])(7.5, 7.5)).toBeNull();
  });
});
