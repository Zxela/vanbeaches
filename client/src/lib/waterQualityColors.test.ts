import { describe, expect, it } from 'vitest';
import { getWaterQualityBgColor, getWaterQualityTextLabel } from './waterQualityColors';

describe('getWaterQualityTextLabel', () => {
  it('returns Safe for good', () => {
    expect(getWaterQualityTextLabel('good')).toBe('Safe');
  });
  it('returns Advisory for advisory', () => {
    expect(getWaterQualityTextLabel('advisory')).toBe('Advisory');
  });
  it('returns Closed for closed', () => {
    expect(getWaterQualityTextLabel('closed')).toBe('Closed');
  });
  it('returns Unknown for unknown', () => {
    expect(getWaterQualityTextLabel('unknown')).toBe('Unknown');
  });
  it('returns Off-Season for off-season', () => {
    expect(getWaterQualityTextLabel('off-season')).toBe('Off-Season');
  });
});

describe('getWaterQualityBgColor', () => {
  it('returns emerald classes for good', () => {
    expect(getWaterQualityBgColor('good')).toBe('bg-emerald-100 text-emerald-800');
  });
  it('returns amber classes for advisory', () => {
    expect(getWaterQualityBgColor('advisory')).toBe('bg-amber-100 text-amber-800');
  });
  it('returns red classes for closed', () => {
    expect(getWaterQualityBgColor('closed')).toBe('bg-red-100 text-red-800');
  });
  it('returns sand classes for unknown', () => {
    expect(getWaterQualityBgColor('unknown')).toBe('bg-sand-100 text-sand-600');
  });
  it('returns sand classes for off-season', () => {
    expect(getWaterQualityBgColor('off-season')).toBe('bg-sand-100 text-sand-600');
  });
});
