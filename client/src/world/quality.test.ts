import { describe, expect, it } from 'vitest';
import { QUALITY_BUDGETS, chooseQuality, lowerQuality } from './quality';

describe('world quality policy', () => {
  it('bounds software and low-memory devices even when high quality was requested', () => {
    expect(chooseQuality({ softwareRenderer: true, requested: 'HIGH' })).toBe('LOW');
    expect(chooseQuality({ deviceMemory: 2, requested: 'HIGH' })).toBe('LOW');
    expect(chooseQuality({ coarsePointer: true })).toBe('MEDIUM');
    expect(chooseQuality({ deviceMemory: 4 })).toBe('MEDIUM');
    expect(chooseQuality({ requested: 'invalid' })).toBe('HIGH');
    expect(chooseQuality({ requested: 'LOW' })).toBe('LOW');
  });

  it('removes optional life and fine geometry first and never increases a budget on downgrade', () => {
    for (const tier of ['HIGH', 'MEDIUM'] as const) {
      const lower = QUALITY_BUDGETS[lowerQuality(tier)];
      for (const [key, value] of Object.entries(QUALITY_BUDGETS[tier])) {
        const next = lower[key as keyof typeof lower];
        expect(Number(next)).toBeLessThanOrEqual(Number(value));
      }
    }
    expect(lowerQuality('LOW')).toBe('LOW');
    expect(QUALITY_BUDGETS.LOW.maxEntities).toBe(0);
    expect(QUALITY_BUDGETS.LOW.maxParticles).toBe(0);
    expect(QUALITY_BUDGETS.LOW.maxDetailTiles).toBeGreaterThan(0);
  });
});
