import proj4 from 'proj4';
import type { Point, WorldManifest } from './types';

// EPSG:3157 with the same NAD83(CSRS)->WGS84 (2) operation selected by Phase 1
// PROJ. Proj4 uses position-vector rotations, opposite the EPSG coordinate-frame signs.
const COAST_CRS =
  '+proj=utm +zone=10 +ellps=GRS80 +towgs84=-0.991,1.9072,0.5129,0.0257899075194932,0.0096500989602704,0.0116599432323421,0 +units=m +no_defs';

export const blenderToWeb = ([east, north, up]: Point): Point => [east, up, -north];
export const webToBlender = ([east, up, south]: Point): Point => [east, -south, up];
export const tideToWorld = (tideCD: number, offset: number) => tideCD + offset;

export function createCoordinates(origin: WorldManifest['origin']) {
  if (origin.crs !== 'EPSG:3157') throw new Error('Unsupported coastal projection');
  return {
    latLonToWorld(latitude: number, longitude: number, elevation = 0): Point {
      const [east, north] = proj4('EPSG:4326', COAST_CRS, [longitude, latitude]);
      return blenderToWeb([east - origin.utm[0], north - origin.utm[1], elevation]);
    },
    worldToLatLon(point: Point) {
      const [east, north, elevation] = webToBlender(point);
      const [longitude, latitude] = proj4(COAST_CRS, 'EPSG:4326', [
        east + origin.utm[0],
        north + origin.utm[1],
      ]);
      return { latitude, longitude, elevation };
    },
  };
}
