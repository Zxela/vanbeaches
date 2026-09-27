import { describe, expect, it } from 'vitest';
import { blenderToWeb, createCoordinates, tideToWorld, webToBlender } from './coordinates';

const origin = {
  latitude: 49.28,
  longitude: -123.19,
  utm: [486182.1092244953, 5458599.544352132, 0] as [number, number, number],
  crs: 'EPSG:3157',
};
describe('Phase 1 coordinate agreement', () => {
  it('matches pyproj reference coordinates, including the datum operation', () => {
    const coordinates = createCoordinates(origin);
    const reference = coordinates.latLonToWorld(49.2766, -123.2249, 7.994028568);
    expect(reference[0]).toBeCloseTo(-2539.456270969007, 2);
    expect(reference[1]).toBeCloseTo(7.994028568, 6);
    expect(reference[2]).toBeCloseTo(371.01422674395144, 2);
    const geographic = coordinates.worldToLatLon(reference);
    expect(geographic.latitude).toBeCloseTo(49.2766, 7);
    expect(geographic.longitude).toBeCloseTo(-123.2249, 7);
  });
  it('preserves handedness, metres, and tide CD relationship', () => {
    expect(blenderToWeb([100, 200, 3])).toEqual([100, 3, -200]);
    expect(webToBlender(blenderToWeb([100, 200, 3]))).toEqual([100, 200, 3]);
    expect([0.5, 1.5, 3, 4.5, 5].map((tide) => tideToWorld(tide, -3))).toEqual([
      -2.5, -1.5, 0, 1.5, 2,
    ]);
  });
});
