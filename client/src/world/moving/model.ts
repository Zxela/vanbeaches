import { createCoordinates } from '../coordinates';
import type { Point, WorldManifest } from '../types';

export type EntityKind = 'vessel' | 'ferry' | 'sailboat' | 'aircraft' | 'vehicle' | 'bird';
export interface MovingEntity {
  id: string;
  type: EntityKind;
  subtype: string;
  position: Point;
  altitude: number;
  heading: number; // radians clockwise from north
  speed: number; // metres/second
  timestamp: string;
  source: 'procedural-vancouver-v1';
  live: false;
  active: boolean;
}
export interface NavigationMask {
  isNavigable(x: number, z: number, tide: number, draft: number): boolean;
}
export interface Route {
  id: string;
  type: EntityKind;
  subtype: string;
  points: Point[];
  speed: number;
  phase: number;
  draft: number;
  beam: number;
  dwell?: number;
}
export const isMarine = (route: Route) => ['vessel', 'ferry', 'sailboat'].includes(route.type);

/** Check the entire corridor, including between waypoints and across the hull width. */
export function routeNavigable(route: Route, mask: NavigationMask | null, tide: number) {
  if (!mask || !route.points.length) return false;
  for (let i = 0; i < Math.max(1, route.points.length - 1); i++) {
    const a = route.points[i];
    const b = route.points[Math.min(i + 1, route.points.length - 1)];
    const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const steps = Math.max(1, Math.ceil(length / 10));
    const nx = length ? -(b[2] - a[2]) / length : 1;
    const nz = length ? (b[0] - a[0]) / length : 0;
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      for (const side of [-1, 0, 1]) {
        const margin = (route.beam / 2 + 4) * side;
        if (
          !mask.isNavigable(
            a[0] + (b[0] - a[0]) * t + nx * margin,
            a[2] + (b[2] - a[2]) * t + nz * margin,
            tide,
            route.draft,
          )
        )
          return false;
      }
    }
  }
  return true;
}

/** Distance-based ping-pong paths avoid splines cutting corners across land. */
export function sampleRoute(route: Route, seconds: number): MovingEntity {
  const lengths = route.points
    .slice(1)
    .map((p, i) => Math.hypot(...p.map((v, axis) => v - route.points[i][axis])));
  const length = lengths.reduce((a, b) => a + b, 0);
  const duration = length / Math.max(0.001, route.speed);
  const dwell = route.dwell ?? 0;
  const oneWay = route.type === 'aircraft' || route.type === 'vehicle';
  const cycle = (oneWay ? 1 : 2) * (duration + dwell);
  const phase = cycle ? (((seconds + route.phase) % cycle) + cycle) % cycle : 0;
  const reverse = !oneWay && phase >= duration + dwell;
  const leg = reverse ? phase - duration - dwell : phase;
  let distance = Math.min(leg, duration) * route.speed;
  if (reverse) distance = length - distance;
  let index = 0;
  while (index < lengths.length - 1 && distance > lengths[index]) distance -= lengths[index++];
  const a = route.points[index];
  const b = route.points[Math.min(index + 1, route.points.length - 1)];
  const t = lengths[index] ? Math.min(1, distance / lengths[index]) : 0;
  const position = a.map((v, axis) => v + (b[axis] - v) * t) as Point;
  return {
    id: route.id,
    type: route.type,
    subtype: route.subtype,
    position,
    altitude: position[1],
    heading: Math.atan2(b[0] - a[0], -(b[2] - a[2])) + (reverse ? Math.PI : 0),
    speed: leg >= duration ? 0 : route.speed,
    timestamp: new Date(seconds * 1000).toISOString(),
    source: 'procedural-vancouver-v1',
    live: false,
    active: !oneWay || phase < duration,
  };
}

export function createRoutes(manifest: WorldManifest): Route[] {
  const coords = createCoordinates(manifest.origin);
  const routes: Route[] = [];
  const add = (
    id: string,
    type: EntityKind,
    subtype: string,
    speed: number,
    phase: number,
    points: Point[],
    draft = 0,
    beam = 1,
    dwell = 0,
  ) =>
    routes.push({
      id,
      type,
      subtype,
      speed,
      phase,
      points: points.map(([lat, lon, altitude]) => coords.latLonToWorld(lat, lon, altitude)),
      draft,
      beam,
      dwell,
    });
  // Deliberately sparse English Bay anchorages and outer-bay channel, not observed AIS positions.
  add('bay-anchor-west', 'vessel', 'bulk-carrier', 0, 0, [[49.294, -123.222, 0]], 11, 32);
  add('bay-anchor-east', 'vessel', 'bulk-carrier', 0, 0, [[49.294, -123.187, 0]], 11, 32);
  add(
    'bay-channel',
    'vessel',
    'bulk-carrier',
    3.2,
    500,
    [
      [49.296, -123.252, 0],
      [49.302, -123.211, 0],
      [49.302, -123.187, 0],
    ],
    11,
    32,
    120,
  );
  // Centreline follows the creek around Granville Island; dock approaches intentionally omitted.
  const creek: Point[] = [
    [49.2765, -123.139, 0],
    [49.2733, -123.1335, 0],
    [49.2715, -123.131, 0],
    [49.27, -123.127, 0],
    [49.27, -123.122, 0],
    [49.271, -123.118, 0],
    [49.272, -123.115, 0],
    [49.2735, -123.109, 0],
    [49.2746, -123.106, 0],
  ];
  add('false-creek-west', 'ferry', 'local-ferry', 2.7, 20, creek.slice(0, 4), 0.7, 4, 45);
  add('false-creek-east', 'ferry', 'local-ferry', 2.7, 150, creek.slice(3), 0.7, 4, 45);
  add(
    'seabus',
    'ferry',
    'seabus',
    5.5,
    90,
    [
      [49.2916, -123.1108, 0],
      [49.297, -123.105, 0],
      [49.309, -123.084, 0],
    ],
    3,
    12,
    120,
  );
  for (let i = 0; i < 6; i++)
    add(
      `sail-${i}`,
      'sailboat',
      'sloop',
      1.9,
      i * 330,
      [
        [49.283 + i * 0.0015, -123.213, 0],
        [49.287 + i * 0.001, -123.192, 0],
        [49.284 + i * 0.001, -123.177, 0],
      ],
      2.2,
      3,
    );
  // YVR's east/west approach corridor. Altitudes are metres in the world's vertical datum.
  add(
    'yvr-approach',
    'aircraft',
    'jet',
    72,
    70,
    [
      [49.194, -123.38, 1350],
      [49.1945, -123.25, 480],
      [49.1947, -123.185, 55],
    ],
    0,
    1,
    300,
  );
  add(
    'yvr-departure',
    'aircraft',
    'jet',
    86,
    250,
    [
      [49.207, -123.183, 70],
      [49.2068, -123.28, 720],
      [49.206, -123.43, 1800],
    ],
    0,
    1,
    420,
  );
  add(
    'harbour-floatplane',
    'aircraft',
    'floatplane',
    42,
    110,
    [
      [49.299, -123.125, 20],
      [49.306, -123.146, 190],
      [49.313, -123.188, 450],
      [49.323, -123.245, 650],
    ],
    0,
    1,
    220,
  );
  add(
    'harbour-helicopter',
    'aircraft',
    'helicopter',
    46,
    210,
    [
      [49.29, -123.104, 50],
      [49.303, -123.1, 220],
      [49.32, -123.08, 420],
    ],
    0,
    1,
    320,
  );
  for (let i = 0; i < 12; i++)
    add(`gull-${i}`, 'bird', 'seabird', 8, i * 13, [
      [49.277 + i * 0.00025, -123.167, 18 + i],
      [49.282 + i * 0.00025, -123.164, 30 + i],
      [49.284 + i * 0.00025, -123.171, 22 + i],
    ]);
  return routes;
}
