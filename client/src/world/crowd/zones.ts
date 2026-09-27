import type { Destination } from '../types';
import metadata from './activity-zones.json';
import { CROWD_RENDER, type ZoneKind } from './tuning';

export type Point2 = readonly [number, number];
export interface ActivityZone {
  id: string;
  kind: ZoneKind;
  polygon: Point2[];
  maxElevation?: number;
  excludeFrom?: string[];
}
export interface MaskCell {
  x: number;
  z: number;
  y: number;
  zone: ActivityZone;
}
export type HeightSampler = (x: number, z: number) => number | null;
export const ACTIVITY_ZONES = metadata;
export function zonesFor(id: string): ActivityZone[] {
  return (metadata.beaches as unknown as Record<string, ActivityZone[]>)[id] ?? [];
}
export function insidePolygon(x: number, z: number, polygon: readonly Point2[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
export function allowedInZone(x: number, z: number, zone: ActivityZone, zones: ActivityZone[]) {
  return (
    insidePolygon(x, z, zone.polygon) &&
    !zones.some(
      (other) =>
        other.kind === 'restricted' &&
        (!other.excludeFrom || other.excludeFrom.includes(zone.id)) &&
        insidePolygon(x, z, other.polygon),
    )
  );
}

/** Decode the existing RG survey atlas without inventing elevations in missing coverage. */
export function atlasSampler(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  bounds: readonly number[],
): HeightSampler {
  const [west, north, east, south] = bounds;
  return (x, z) => {
    const col = ((x - west) / (east - west)) * width - 0.5;
    const row = ((z - north) / (south - north)) * height - 0.5;
    const c = Math.floor(col);
    const r = Math.floor(row);
    if (c < 0 || r < 0 || c + 1 >= width || r + 1 >= height) return null;
    const indices = [
      r * width + c,
      r * width + c + 1,
      (r + 1) * width + c,
      (r + 1) * width + c + 1,
    ];
    if (indices.some((i) => data[i * 4 + 3] === 0)) return null;
    const values = indices.map((i) => (data[i * 4] * 256 + data[i * 4 + 1]) * 0.01 - 512);
    const tx = col - c;
    const tz = row - r;
    return (
      (values[0] * (1 - tx) + values[1] * tx) * (1 - tz) +
      (values[2] * (1 - tx) + values[3] * tx) * tz
    );
  };
}

/** Exportable cells have a semantic zone and measured height; tide is evaluated at runtime. */
export function buildActivityMask(beach: Destination, sample: HeightSampler): MaskCell[] {
  const zones = zonesFor(beach.id);
  const cells: MaskCell[] = [];
  const step = CROWD_RENDER.maskCellMetres;
  for (const zone of zones) {
    if (zone.kind === 'restricted') continue;
    const xs = zone.polygon.map((p) => p[0]);
    const zs = zone.polygon.map((p) => p[1]);
    for (let x = Math.min(...xs) + step / 2; x < Math.max(...xs); x += step) {
      for (let z = Math.min(...zs) + step / 2; z < Math.max(...zs); z += step) {
        if (!allowedInZone(x, z, zone, zones)) continue;
        const wx = beach.worldPosition[0] + x;
        const wz = beach.worldPosition[2] + z;
        const y = sample(wx, wz);
        const east = sample(wx + step, wz);
        const south = sample(wx, wz + step);
        if (y === null || east === null || south === null || y > (zone.maxElevation ?? 5)) continue;
        if (Math.hypot(east - y, south - y) / step > CROWD_RENDER.maxSlope) continue;
        cells.push({ x: wx, z: wz, y, zone });
      }
    }
  }
  return cells;
}

export function cellAvailable(cell: MaskCell, tide: number, waterEnabled: boolean) {
  if (cell.zone.kind === 'shallows') {
    const depth = tide - cell.y;
    return waterEnabled && depth >= CROWD_RENDER.wadeDepth[0] && depth <= CROWD_RENDER.swimDepth[1];
  }
  return cell.y > tide + CROWD_RENDER.dryClearance;
}
