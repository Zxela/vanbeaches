import { describe, expect, it } from 'vitest';
import { type BeachVibe, beachPersonalities, getPersonality } from './beach-personalities';

// All 9 beach slugs from shared/src/data/beaches.ts
const EXPECTED_SLUGS = [
  'english-bay',
  'jericho-beach',
  'kitsilano-beach',
  'locarno-beach',
  'second-beach',
  'spanish-banks',
  'sunset-beach',
  'third-beach',
  'trout-lake',
];

const VALID_VIBES: BeachVibe[] = [
  'active',
  'quiet',
  'family',
  'dog-friendly',
  'sunset',
  'social',
  'nature',
  'urban',
];

describe('BeachPersonality interface shape', () => {
  it('each personality has required string fields', () => {
    for (const p of beachPersonalities) {
      expect(typeof p.slug).toBe('string');
      expect(p.slug.length).toBeGreaterThan(0);

      expect(typeof p.archetype).toBe('string');
      expect(p.archetype.length).toBeGreaterThan(0);

      expect(typeof p.tagline).toBe('string');
      expect(p.tagline.length).toBeGreaterThan(0);

      expect(typeof p.editorial).toBe('string');
      expect(p.editorial.length).toBeGreaterThan(0);

      expect(typeof p.accentColor).toBe('string');
      expect(p.accentColor.length).toBeGreaterThan(0);
    }
  });

  it('each personality has differentiators as non-empty string array', () => {
    for (const p of beachPersonalities) {
      expect(Array.isArray(p.differentiators)).toBe(true);
      expect(p.differentiators.length).toBeGreaterThanOrEqual(2);
      for (const d of p.differentiators) {
        expect(typeof d).toBe('string');
      }
    }
  });

  it('each personality has vibes as array of valid BeachVibe values', () => {
    for (const p of beachPersonalities) {
      expect(Array.isArray(p.vibes)).toBe(true);
      expect(p.vibes.length).toBeGreaterThanOrEqual(2);
      expect(p.vibes.length).toBeLessThanOrEqual(4);
      for (const v of p.vibes) {
        expect(VALID_VIBES).toContain(v);
      }
    }
  });

  it('each personality has instagramPostUrls as string array', () => {
    for (const p of beachPersonalities) {
      expect(Array.isArray(p.instagramPostUrls)).toBe(true);
      for (const url of p.instagramPostUrls) {
        expect(typeof url).toBe('string');
      }
    }
  });

  it('instagramHashtag is a string when present', () => {
    for (const p of beachPersonalities) {
      if (p.instagramHashtag !== undefined) {
        expect(typeof p.instagramHashtag).toBe('string');
        expect(p.instagramHashtag.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('beachPersonalities array coverage', () => {
  it('contains exactly 9 entries', () => {
    expect(beachPersonalities).toHaveLength(9);
  });

  it('contains entries for all 9 Vancouver beaches', () => {
    const slugs = beachPersonalities.map((p) => p.slug);
    for (const expected of EXPECTED_SLUGS) {
      expect(slugs).toContain(expected);
    }
  });

  it('has no duplicate slugs', () => {
    const slugs = beachPersonalities.map((p) => p.slug);
    const unique = new Set(slugs);
    expect(unique.size).toBe(slugs.length);
  });
});

describe('getPersonality helper', () => {
  it('returns the matching personality for a known slug', () => {
    const kits = getPersonality('kitsilano-beach');
    expect(kits).toBeDefined();
    expect(kits?.slug).toBe('kitsilano-beach');
  });

  it('returns undefined for an unknown slug', () => {
    const result = getPersonality('nonexistent-beach');
    expect(result).toBeUndefined();
  });

  it('returns the correct personality for every expected slug', () => {
    for (const slug of EXPECTED_SLUGS) {
      const p = getPersonality(slug);
      expect(p).toBeDefined();
      expect(p?.slug).toBe(slug);
    }
  });
});

describe('specific personality content', () => {
  it('kitsilano-beach archetype matches The Sporty Heart', () => {
    const kits = getPersonality('kitsilano-beach');
    expect(kits?.archetype).toBe('The Sporty Heart');
  });

  it('english-bay archetype matches The Sunset Stage', () => {
    const eb = getPersonality('english-bay');
    expect(eb?.archetype).toBe('The Sunset Stage');
  });

  it('kitsilano-beach has active and social vibes', () => {
    const kits = getPersonality('kitsilano-beach');
    expect(kits?.vibes).toContain('active');
    expect(kits?.vibes).toContain('social');
  });

  it('english-bay has sunset vibe', () => {
    const eb = getPersonality('english-bay');
    expect(eb?.vibes).toContain('sunset');
  });
});
