export type WaterQualityLevel = 'good' | 'advisory' | 'closed' | 'unknown' | 'off-season';

export interface WaterQualityStatus {
  beachId: string;
  level: WaterQualityLevel;
  ecoliCount: number | null;
  advisoryReason: string | null;
  sampleDate: string | null;
  fetchedAt: string;
}

export function isWaterQualityLevel(value: unknown): value is WaterQualityLevel {
  return (
    typeof value === 'string' &&
    ['good', 'advisory', 'closed', 'unknown', 'off-season'].includes(value)
  );
}

export function isWaterQualityStatus(value: unknown): value is WaterQualityStatus {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.beachId === 'string' &&
    isWaterQualityLevel(obj.level) &&
    (obj.ecoliCount === null || typeof obj.ecoliCount === 'number') &&
    (obj.advisoryReason === null || typeof obj.advisoryReason === 'string') &&
    (obj.sampleDate === null || typeof obj.sampleDate === 'string') &&
    typeof obj.fetchedAt === 'string'
  );
}
