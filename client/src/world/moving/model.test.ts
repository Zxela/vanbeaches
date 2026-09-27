import { describe, expect, it } from 'vitest';
import { type Route, routeNavigable, sampleRoute } from './model';

const route: Route = {
  id: 'test',
  type: 'ferry',
  subtype: 'local-ferry',
  points: [
    [0, 0, 0],
    [100, 0, 0],
    [100, 0, 100],
  ],
  speed: 2,
  phase: 0,
  draft: 1,
  beam: 4,
  dwell: 10,
};

describe('simulated geographic movement', () => {
  it('uses distance and time deterministically without cutting a path corner', () => {
    expect(sampleRoute(route, 25).position).toEqual([50, 0, 0]);
    expect(sampleRoute(route, 75).position).toEqual([100, 0, 50]);
    expect(sampleRoute(route, 25).position).toEqual(sampleRoute(route, 245).position);
  });
  it('dwells then returns along the same corridor', () => {
    expect(sampleRoute(route, 105).position).toEqual([100, 0, 100]);
    expect(sampleRoute(route, 105).speed).toBe(0);
    expect(sampleRoute(route, 135).position).toEqual([100, 0, 50]);
    expect(sampleRoute(route, 135).heading).toBeCloseTo(Math.PI * 2);
  });
  it('never calls a simulated entity live and keeps metre elevations', () => {
    const entity = sampleRoute(
      {
        ...route,
        type: 'aircraft',
        points: [
          [0, 100, 0],
          [0, 200, 0],
        ],
      },
      25,
    );
    expect(entity.altitude).toBe(150);
    expect(entity.live).toBe(false);
    expect(entity.source).toBe('procedural-vancouver-v1');
  });
  it('does not reverse traffic in its lane or park aircraft in midair', () => {
    const flight = { ...route, type: 'aircraft' as const };
    expect(sampleRoute(flight, 105).active).toBe(false);
    expect(sampleRoute(flight, 135).position).toEqual([50, 0, 0]);
    expect(sampleRoute(flight, 135).heading).toBeCloseTo(Math.PI / 2);
  });
  it('fails closed without a navigation mask', () => {
    expect(routeNavigable(route, null, 0)).toBe(false);
  });
  it('rejects land between valid waypoints and rejects an obstructed hull edge', () => {
    expect(routeNavigable(route, { isNavigable: (x) => x < 40 || x > 60 }, 0)).toBe(false);
    expect(routeNavigable(route, { isNavigable: (_x, z) => z >= 0 }, 0)).toBe(false);
    expect(routeNavigable(route, { isNavigable: () => true }, 0)).toBe(true);
  });
  it('passes draft and current tide to every corridor check', () => {
    expect(
      routeNavigable(route, { isNavigable: (_x, _z, tide, draft) => tide - draft > 1 }, 3),
    ).toBe(true);
    expect(
      routeNavigable(route, { isNavigable: (_x, _z, tide, draft) => tide - draft > 1 }, 1),
    ).toBe(false);
  });
  it('keeps anchored ships fixed', () => {
    const anchor = { ...route, speed: 0, points: [[20, 0, 30] as [number, number, number]] };
    expect(sampleRoute(anchor, 700).position).toEqual([20, 0, 30]);
    expect(sampleRoute(anchor, 700).speed).toBe(0);
  });
});
