import type { EnvironmentalState } from '@van-beaches/shared';
import type { Destination } from '../types';
import { type CrowdState, beachBaseline } from './model';
import { ACTIVITY_PROFILES, type Activity, CROWD_RENDER, ZONE_ACTIVITIES } from './tuning';
import { type HeightSampler, type MaskCell, allowedInZone, cellAvailable, zonesFor } from './zones';

export interface Agent {
  id: number;
  beachId: string;
  cell: MaskCell;
  x: number;
  z: number;
  heading: number;
  activity: Activity;
  phase: number;
  alpha: number;
  retiring: boolean;
  color: string;
}
export function seededRandom(seed: string) {
  let n = 2166136261;
  for (const char of seed) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return () => {
    n += 0x6d2b79f5;
    let t = Math.imul(n ^ (n >>> 15), 1 | n);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function representationCount(
  density: number,
  mobile: boolean,
  budget = Number.POSITIVE_INFINITY,
) {
  return Math.round(
    Math.min(budget, mobile ? CROWD_RENDER.mobilePerBeachAgents : CROWD_RENDER.perBeachAgents) *
      Math.max(0, Math.min(1, density)) ** CROWD_RENDER.densityExponent,
  );
}
export function fadeToward(value: number, target: number, dt: number) {
  const delta = Math.max(0, dt) / CROWD_RENDER.fadeSeconds;
  return target > value ? Math.min(target, value + delta) : Math.max(target, value - delta);
}
export function waterActivityEnabled(environment: EnvironmentalState) {
  return (
    environment.weather.source !== 'neutral' &&
    !environment.weather.stale &&
    !environment.tide.stale &&
    environment.weather.temperature >= CROWD_RENDER.waterMinTemperature &&
    environment.weather.precipitation <= CROWD_RENDER.waterMaxRain &&
    environment.weather.windSpeed <= CROWD_RENDER.waterMaxWind &&
    environment.sun.elevation > 0
  );
}
export function activityAvailable(
  activity: Activity,
  cell: MaskCell,
  tide: number,
  environment: EnvironmentalState,
) {
  if (!cellAvailable(cell, tide, waterActivityEnabled(environment))) return false;
  if (activity === 'swim') return tide - cell.y >= CROWD_RENDER.swimDepth[0];
  if (activity === 'wade') return tide - cell.y <= CROWD_RENDER.wadeDepth[1];
  if (activity === 'lie')
    return (
      environment.weather.temperature >= CROWD_RENDER.sunbatheMinTemperature &&
      environment.weather.precipitation <= CROWD_RENDER.waterMaxRain &&
      environment.sun.elevation > 0
    );
  if (activity === 'volleyball')
    return (
      environment.weather.precipitation <= CROWD_RENDER.activePlayMaxRain &&
      environment.sun.elevation > 0
    );
  return true;
}
const palette = ['#d9c4a3', '#b66f51', '#8baba5', '#ddc87e', '#657d92', '#dadbd0'];

export function spawnAgent(
  id: number,
  beach: Destination,
  cells: MaskCell[],
  tide: number,
  environment: EnvironmentalState,
): Agent | null {
  const random = seededRandom(`${beach.id}:${id}`);
  const waterEnabled = waterActivityEnabled(environment);
  const profile = ACTIVITY_PROFILES[beachBaseline(beach.id)?.profile ?? 'natural'];
  const candidates = cells.filter((c) => cellAvailable(c, tide, waterEnabled));
  if (!candidates.length) return null;
  const available = Object.entries(profile).filter(([activity]) =>
    candidates.some(
      (c) =>
        ZONE_ACTIVITIES[c.zone.kind].includes(activity as Activity) &&
        activityAvailable(activity as Activity, c, tide, environment),
    ),
  );
  let choice = random() * available.reduce((sum, [, weight]) => sum + weight, 0);
  const activity = (available.find(([, weight]) => {
    choice -= weight;
    return choice <= 0;
  })?.[0] ?? 'idle') as Activity;
  let pool = candidates.filter(
    (c) =>
      ZONE_ACTIVITIES[c.zone.kind].includes(activity) &&
      activityAvailable(activity, c, tide, environment),
  );
  if (!pool.length) return null;
  // Small deterministic social groups. Spatial variation only; no visitor demographics.
  if (['sit', 'idle', 'lie'].includes(activity) && beachBaseline(beach.id)?.profile === 'social') {
    const anchorRandom = seededRandom(`${beach.id}:group:${Math.floor(id / 4)}`);
    const anchor = pool[Math.floor(anchorRandom() * pool.length)];
    pool = pool.filter(
      (c) => Math.hypot(c.x - anchor.x, c.z - anchor.z) < CROWD_RENDER.socialRadius,
    );
  }
  const cell = pool[Math.floor(random() * pool.length)];
  return {
    id,
    beachId: beach.id,
    cell,
    x: cell.x,
    z: cell.z,
    heading: random() * Math.PI * 2,
    activity,
    phase: random() * Math.PI * 2,
    alpha: 0,
    retiring: false,
    color: palette[Math.floor(random() * palette.length)],
  };
}

export function moveAgent(
  agent: Agent,
  beach: Destination,
  sample: HeightSampler,
  tide: number,
  environment: EnvironmentalState,
  dt: number,
) {
  const speed =
    agent.activity === 'walk'
      ? CROWD_RENDER.walkSpeed
      : agent.activity === 'wade'
        ? CROWD_RENDER.wadeSpeed
        : agent.activity === 'swim'
          ? CROWD_RENDER.swimSpeed
          : 0;
  if (!speed) return;
  const x = agent.x + Math.sin(agent.heading) * speed * dt;
  const z = agent.z + Math.cos(agent.heading) * speed * dt;
  const y = sample(x, z);
  const cell = { ...agent.cell, x, z, y: y ?? agent.cell.y };
  const depth = tide - cell.y;
  const activityDepth =
    agent.activity === 'swim'
      ? depth >= CROWD_RENDER.swimDepth[0]
      : agent.activity === 'wade'
        ? depth <= CROWD_RENDER.wadeDepth[1]
        : true;
  if (
    y !== null &&
    activityDepth &&
    allowedInZone(
      x - beach.worldPosition[0],
      z - beach.worldPosition[2],
      cell.zone,
      zonesFor(beach.id),
    ) &&
    Math.abs(y - agent.cell.y) <= speed * dt * CROWD_RENDER.maxSlope + 0.01 &&
    cellAvailable(cell, tide, waterActivityEnabled(environment))
  ) {
    agent.x = x;
    agent.z = z;
    agent.cell = cell;
  } else agent.heading += Math.PI * 0.85;
}

export interface BeachPopulation {
  beach: Destination;
  state: CrowdState;
  cells: MaskCell[];
  agents: Agent[];
  nextId: number;
  target: number;
}
