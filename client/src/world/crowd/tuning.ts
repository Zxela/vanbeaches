// Artistic representation settings; never used as attendance calibration.
export const CROWD_RENDER = {
  maxAgents: 360,
  mobileMaxAgents: 120,
  perBeachAgents: 260,
  mobilePerBeachAgents: 85,
  densityExponent: 0.8,
  fadeSeconds: 2.5,
  closeDistance: 100,
  mediumDistance: 700,
  cullDistance: 2200,
  mobileCullDistance: 1500,
  closeHz: 24,
  mediumHz: 10,
  mobileHz: 8,
  maskCellMetres: 4,
  dryClearance: 0.2,
  maxSlope: 0.45,
  wadeDepth: [0.15, 0.9],
  swimDepth: [0.9, 1.8],
  waterMinTemperature: 18,
  waterMaxWind: 30,
  waterMaxRain: 0.2,
  walkSpeed: 0.65,
  wadeSpeed: 0.22,
  swimSpeed: 0.35,
  socialRadius: 5,
  spawnSeparation: 0.9,
  sunbatheMinTemperature: 18,
  activePlayMaxRain: 1,
} as const;

export type Activity = 'idle' | 'walk' | 'sit' | 'lie' | 'wade' | 'swim' | 'volleyball';
export type ZoneKind =
  | 'sand'
  | 'shoreline'
  | 'shallows'
  | 'volleyball'
  | 'path'
  | 'grass'
  | 'restricted';
export const ACTIVITY_PROFILES: Record<string, Partial<Record<Activity, number>>> = {
  social: { idle: 16, walk: 16, sit: 24, lie: 22, volleyball: 16, wade: 4, swim: 2 },
  spread: { idle: 8, walk: 52, sit: 19, lie: 12, volleyball: 3, wade: 5, swim: 1 },
  urban: { idle: 16, walk: 38, sit: 27, lie: 13, wade: 4, swim: 2 },
  natural: { idle: 8, walk: 36, sit: 36, lie: 16, wade: 3, swim: 1 },
};
export const ZONE_ACTIVITIES: Record<ZoneKind, readonly Activity[]> = {
  sand: ['idle', 'sit', 'lie'],
  shoreline: ['walk', 'idle'],
  shallows: ['wade', 'swim'],
  volleyball: ['volleyball'],
  path: ['walk'],
  grass: ['idle', 'sit'],
  restricted: [],
};
