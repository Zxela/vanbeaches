export type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH';

export interface QualityBudget {
  maxDpr: number;
  maxDetailTiles: number;
  maxRegionalDetailTiles: number;
  maxConcurrentLoads: number;
  maxGpuBytes: number;
  maxDrawCalls: number;
  maxPeople: number;
  maxEntities: number;
  maxParticles: number;
  fineTerrain: boolean;
  richWater: boolean;
}

// Coarse coast, skyline, bridges and mountain silhouettes survive every tier.
// Budgets limit optional refinement and activity before essential geography.
export const QUALITY_BUDGETS: Readonly<Record<QualityTier, Readonly<QualityBudget>>> = {
  LOW: {
    maxDpr: 1,
    maxDetailTiles: 4,
    maxRegionalDetailTiles: 0,
    maxConcurrentLoads: 2,
    maxGpuBytes: 192 * 1024 * 1024,
    maxDrawCalls: 700,
    maxPeople: 32,
    maxEntities: 0,
    maxParticles: 0,
    fineTerrain: false,
    richWater: false,
  },
  MEDIUM: {
    maxDpr: 1.25,
    maxDetailTiles: 8,
    maxRegionalDetailTiles: 6,
    maxConcurrentLoads: 3,
    maxGpuBytes: 320 * 1024 * 1024,
    maxDrawCalls: 1000,
    maxPeople: 96,
    maxEntities: 12,
    maxParticles: 250,
    fineTerrain: false,
    richWater: true,
  },
  HIGH: {
    maxDpr: 1.5,
    maxDetailTiles: 12,
    maxRegionalDetailTiles: 12,
    maxConcurrentLoads: 5,
    maxGpuBytes: 512 * 1024 * 1024,
    maxDrawCalls: 1400,
    maxPeople: 180,
    maxEntities: 32,
    maxParticles: 700,
    fineTerrain: true,
    richWater: true,
  },
};

export function chooseQuality(options: {
  coarsePointer?: boolean;
  deviceMemory?: number;
  softwareRenderer?: boolean;
  requested?: string | null;
}): QualityTier {
  if (options.softwareRenderer || (options.deviceMemory ?? 8) <= 2) return 'LOW';
  if (['LOW', 'MEDIUM', 'HIGH'].includes(options.requested ?? ''))
    return options.requested as QualityTier;
  return options.coarsePointer || (options.deviceMemory ?? 8) <= 4 ? 'MEDIUM' : 'HIGH';
}

export function lowerQuality(tier: QualityTier): QualityTier {
  return tier === 'HIGH' ? 'MEDIUM' : 'LOW';
}
