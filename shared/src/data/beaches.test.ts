import { describe, expect, it } from 'vitest';
import { BEACHES, getBeachById, getBeachBySlug } from './beaches.js';

describe('BEACHES data', () => {
  it('contains 9 beaches', () => {
    expect(BEACHES).toHaveLength(9);
  });

  it('every beach has a highlights field', () => {
    for (const beach of BEACHES) {
      expect(beach.highlights, `${beach.id} is missing highlights`).toBeDefined();
      expect(beach.highlights?.bestFor).toBeInstanceOf(Array);
      expect(beach.highlights?.bestFor.length).toBeGreaterThanOrEqual(2);
      expect(typeof beach.highlights?.vibe).toBe('string');
      expect(beach.highlights?.vibe.length).toBeGreaterThan(0);
      expect(typeof beach.highlights?.crowdLevel).toBe('string');
      expect(beach.highlights?.crowdLevel.length).toBeGreaterThan(0);
    }
  });

  it('every beach has safetyNotes', () => {
    for (const beach of BEACHES) {
      expect(beach.safetyNotes, `${beach.id} is missing safetyNotes`).toBeDefined();
      expect(beach.safetyNotes?.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every beach has an expanded description (at least 100 characters)', () => {
    for (const beach of BEACHES) {
      expect(beach.description, `${beach.id} is missing description`).toBeDefined();
      expect(beach.description?.length).toBeGreaterThanOrEqual(100);
    }
  });

  it('only uses complete, CDN-ready image metadata when a verified image is present', () => {
    for (const beach of BEACHES) {
      if (!beach.images) continue;
      expect(beach.images?.hero).toMatch(/^https:\/\//);
      expect(beach.images?.thumb).toMatch(/^https:\/\//);
      expect(beach.images?.credit.name.length).toBeGreaterThan(0);
      expect(beach.images?.credit.username.length).toBeGreaterThan(0);
    }
  });

  it('hero images are delivered over HTTPS', () => {
    for (const beach of BEACHES) {
      if (beach.images) {
        expect(beach.images.hero).toMatch(/^https:\/\//);
      }
    }
  });

  it('thumbnail images are delivered over HTTPS', () => {
    for (const beach of BEACHES) {
      if (beach.images) {
        expect(beach.images.thumb).toMatch(/^https:\/\//);
      }
    }
  });

  it('getBeachById returns correct beach', () => {
    const beach = getBeachById('english-bay');
    expect(beach).toBeDefined();
    expect(beach?.name).toBe('English Bay');
  });

  it('getBeachBySlug returns correct beach', () => {
    const beach = getBeachBySlug('kitsilano-beach');
    expect(beach).toBeDefined();
    expect(beach?.name).toBe('Kitsilano Beach');
  });

  it('trout-lake has no tideStationId (freshwater lake)', () => {
    const troutLake = getBeachById('trout-lake');
    expect(troutLake?.tideStationId).toBeNull();
  });

  it('all ocean beaches have a tideStationId', () => {
    const oceanBeaches = BEACHES.filter((b) => b.id !== 'trout-lake');
    for (const beach of oceanBeaches) {
      expect(beach.tideStationId, `${beach.id} should have tideStationId`).not.toBeNull();
    }
  });

  it('each beach has a unique id', () => {
    const ids = BEACHES.map((b) => b.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(BEACHES.length);
  });

  it('each beach slug matches the id', () => {
    for (const beach of BEACHES) {
      expect(beach.slug).toBe(beach.id);
    }
  });

  it('beaches with firepits include bonfire safety notes', () => {
    const beachesWithFirepits = BEACHES.filter((b) => b.amenities?.firepits);
    for (const beach of beachesWithFirepits) {
      const hasFireNote = beach.safetyNotes?.some((note) => note.toLowerCase().includes('fire'));
      expect(hasFireNote, `${beach.id} has firepits but no bonfire safety note`).toBe(true);
    }
  });

  it('beaches without a lifeguard include "No lifeguard" safety note', () => {
    const unguardedBeaches = BEACHES.filter((b) => b.amenities?.lifeguard === 'none');
    for (const beach of unguardedBeaches) {
      const hasNote = beach.safetyNotes?.some((note) =>
        note.toLowerCase().includes('no lifeguard'),
      );
      expect(hasNote, `${beach.id} has no lifeguard but is missing a safety note`).toBe(true);
    }
  });
});
