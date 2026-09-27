import { describe, expect, it } from 'vitest';
import { normalizeEnvironment } from '../environment';
import type { Destination } from '../types';
import { beachBaseline, crowdCategory, estimateCrowd, localCalendar } from './model';
import { fadeToward, moveAgent, representationCount, spawnAgent } from './population';
import { CROWD_RENDER, ZONE_ACTIVITIES } from './tuning';
import {
  type ActivityZone,
  type MaskCell,
  allowedInZone,
  atlasSampler,
  buildActivityMask,
  cellAvailable,
  zonesFor,
} from './zones';

const location = { latitude: 49.2732, longitude: -123.1536 };
function environment(time = '2026-07-04T15:00:00-07:00') {
  const state = normalizeEnvironment(null, Date.parse(time), 'TIMELINE', location);
  state.weather = {
    ...state.weather,
    temperature: 28,
    precipitation: 0,
    cloudCover: 5,
    windSpeed: 8,
    source: 'forecast',
    stale: false,
  };
  state.tide = { ...state.tide, heightCD: 2, stale: false, source: 'predicted' };
  return state;
}
const beach: Destination = {
  id: 'kitsilano-beach',
  slug: 'kitsilano-beach',
  worldPosition: [0, 0, 0],
  cameraTarget: [0, 0, 0],
  cameraApproach: [0, 10, 0],
  preferredAltitude: 100,
};

describe('transparent estimated activity', () => {
  it('distinguishes the three acceptance scenarios', () => {
    const kits = estimateCrowd('kitsilano-beach', environment(), location);
    const rain = environment('2026-07-07T09:00:00-07:00');
    rain.weather = { ...rain.weather, temperature: 12, precipitation: 3, cloudCover: 100 };
    const spanish = estimateCrowd('spanish-banks', rain, location);
    const sunset = estimateCrowd('english-bay', environment('2026-07-07T20:45:00-07:00'), location);
    expect(kits?.category).toBe('very busy');
    expect(spanish?.category).toBe('quiet');
    expect(sunset?.category).toBe('busy');
    expect(kits?.normalizedDensity).toBeGreaterThan(sunset?.normalizedDensity ?? 1);
    expect(sunset?.normalizedDensity).toBeGreaterThan((spanish?.normalizedDensity ?? 1) * 5);
    expect([kits, spanish, sunset].every((s) => s?.confidence === 'low')).toBe(true);
  });
  it('uses Vancouver calendar boundaries independently of the browser timezone', () => {
    expect(localCalendar('2026-07-05T03:00:00Z')).toMatchObject({
      hour: 20,
      weekend: true,
      date: '2026-07-04',
    });
    expect(localCalendar('2026-11-01T09:30:00Z').hour).toBe(1.5);
    expect(localCalendar('2026-03-08T10:30:00Z').hour).toBe(3.5);
  });
  it('supports explicit holidays, local calibration and hourly curve overrides', () => {
    const state = environment('2026-07-07T15:00:00-07:00');
    const base = beachBaseline('kitsilano-beach');
    if (!base) throw new Error('Missing baseline');
    const weekday = estimateCrowd(beach.id, state, location);
    expect(
      estimateCrowd(beach.id, state, location, { holiday: true })?.normalizedDensity,
    ).toBeGreaterThan(weekday?.normalizedDensity ?? 1);
    const calibrated = estimateCrowd(beach.id, state, location, {
      baseline: { ...base, calibrationScale: 0.5 },
    });
    expect(calibrated?.normalizedDensity).toBeCloseTo((weekday?.normalizedDensity ?? 0) / 2);
    expect(
      estimateCrowd(beach.id, state, location, {
        baseline: { ...base, weekdayCurve: Array(24).fill(0) },
      })?.normalizedDensity,
    ).toBe(0);
  });
  it('reports limited inputs and excludes fabricated neutral weather modifiers', () => {
    const state = environment();
    state.weather.source = 'neutral';
    const crowd = estimateCrowd(beach.id, state, location);
    expect(crowd?.basis).toBe('limited-data');
    expect(crowd?.factors.temperature).toBe(1);
    expect(estimateCrowd('unknown', state, location)).toBeNull();
    expect(estimateCrowd(beach.id, { ...state, timestamp: 'bad' }, location)).toBeNull();
  });
  it('responds to season, wind, clouds, night and tide without scientific precision', () => {
    const base = environment();
    const score = (s = base) => estimateCrowd('spanish-banks', s, location)?.normalizedDensity ?? 0;
    const original = score();
    expect(score({ ...base, weather: { ...base.weather, windSpeed: 55 } })).toBeLessThan(original);
    expect(score({ ...base, weather: { ...base.weather, cloudCover: 100 } })).toBeLessThan(
      original,
    );
    expect(score({ ...base, sun: { ...base.sun, elevation: -10 } })).toBeLessThan(original);
    expect(score({ ...base, tide: { ...base.tide, heightCD: 0.5 } })).toBeGreaterThan(original);
    expect(score(environment('2026-01-03T15:00:00-08:00'))).toBeLessThan(original);
    expect((estimateCrowd(beach.id, base, location)?.estimatedPeople ?? 1) % 25).toBe(0);
    expect([0, 0.2, 0.5, 0.78].map(crowdCategory)).toEqual([
      'quiet',
      'moderate',
      'busy',
      'very busy',
    ]);
  });
});

describe('activity masks and representation', () => {
  it('builds only permitted semantic cells, rejects missing ground and steep terrain', () => {
    const cells = buildActivityMask(beach, () => 3);
    expect(cells.length).toBeGreaterThan(100);
    for (const cell of cells)
      expect(allowedInZone(cell.x, cell.z, cell.zone, zonesFor(beach.id))).toBe(true);
    expect(buildActivityMask(beach, () => null)).toEqual([]);
    expect(buildActivityMask(beach, (x) => x * 2)).toEqual([]);
    const court = zonesFor(beach.id).find((z) => z.id === 'courts') as ActivityZone;
    const sand = zonesFor(beach.id).find((z) => z.id === 'sand') as ActivityZone;
    expect(allowedInZone(-20, -70, sand, zonesFor(beach.id))).toBe(false);
    expect(allowedInZone(-20, -70, court, zonesFor(beach.id))).toBe(true);
  });
  it('spawns reproducible appropriate activities and constrains all movement', () => {
    const cells = buildActivityMask(beach, () => 3);
    const state = environment();
    for (let i = 0; i < 40; i++) {
      const a = spawnAgent(i, beach, cells, 0, state);
      expect(a).toEqual(spawnAgent(i, beach, cells, 0, state));
      if (!a) throw new Error('No agent');
      expect(ZONE_ACTIVITIES[a.cell.zone.kind]).toContain(a.activity);
      for (let tick = 0; tick < 500; tick++) moveAgent(a, beach, () => 3, 0, state, 0.1);
      expect(allowedInZone(a.x, a.z, a.cell.zone, zonesFor(beach.id))).toBe(true);
    }
  });
  it('suppresses flooded dry cells and bounds water activity depth', () => {
    const cell: MaskCell = { x: 0, y: 1, z: 0, zone: { id: 'sand', kind: 'sand', polygon: [] } };
    expect(cellAvailable(cell, 2, true)).toBe(false);
    const water = { ...cell, zone: { ...cell.zone, kind: 'shallows' as const } };
    expect(cellAvailable(water, 1.5, true)).toBe(true);
    expect(cellAvailable(water, 1.5, false)).toBe(false);
    expect(cellAvailable(water, 4, true)).toBe(false);
    expect(
      spawnAgent(1, beach, [water], 1.5, {
        ...environment(),
        weather: { ...environment().weather, precipitation: 4 },
      }),
    ).toBeNull();
  });
  it('decodes survey coverage and bilinear heights without extrapolating missing pixels', () => {
    const bytes = new Uint8ClampedArray([
      200, 0, 0, 255, 200, 100, 0, 255, 200, 200, 0, 255, 201, 44, 0, 255,
    ]);
    expect(atlasSampler(bytes, 2, 2, [0, 0, 2, 2])(1, 1)).toBeCloseTo(1.5);
    bytes[3] = 0;
    expect(atlasSampler(bytes, 2, 2, [0, 0, 2, 2])(1, 1)).toBeNull();
    expect(atlasSampler(bytes, 2, 2, [0, 0, 2, 2])(-1, 1)).toBeNull();
  });
  it('bounds nonlinear population budgets and fades without teleporting density', () => {
    expect(representationCount(0, false)).toBe(0);
    expect(representationCount(1, false)).toBe(CROWD_RENDER.perBeachAgents);
    expect(representationCount(1, true)).toBeLessThan(representationCount(1, false));
    expect(representationCount(100, false)).toBe(CROWD_RENDER.perBeachAgents);
    expect(representationCount(1, true, 32)).toBe(32);
    expect(representationCount(0.8, true, 32)).toBeGreaterThan(representationCount(0.4, true, 32));
    expect(representationCount(0.8, true, 0)).toBe(0);
    expect(fadeToward(0, 1, 0.1)).toBeGreaterThan(0);
    expect(fadeToward(0, 1, 0.1)).toBeLessThan(1);
    expect(fadeToward(1, 0, 0.1)).toBeGreaterThan(0);
    expect(fadeToward(0, 1, 100)).toBe(1);
    expect(fadeToward(1, 0, 100)).toBe(0);
  });
});
