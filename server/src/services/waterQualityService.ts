import type { WaterQualityStatus, WaterQualityLevel } from '@van-beaches/shared';
import { cacheManager } from '../cache/cacheManager.js';

const WATER_QUALITY_CACHE_TTL = 21600000; // 6 hours

export async function getWaterQuality(beachId: string): Promise<WaterQualityStatus> {
  const cacheKey = 'waterquality:' + beachId;
  
  return cacheManager.getOrFetch(cacheKey, async () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    if (month >= 10 || month <= 4) {
      return {
        beachId,
        level: 'off-season' as WaterQualityLevel,
        ecoliCount: null,
        advisoryReason: null,
        sampleDate: null,
        fetchedAt: new Date().toISOString(),
      };
    }
    
    const mockStatuses: WaterQualityLevel[] = ['good', 'good', 'good', 'advisory', 'good'];
    const randomLevel = mockStatuses[Math.floor(Math.random() * mockStatuses.length)];
    
    return {
      beachId,
      level: randomLevel,
      ecoliCount: randomLevel === 'good' ? Math.floor(Math.random() * 100) : Math.floor(Math.random() * 300) + 200,
      advisoryReason: randomLevel === 'advisory' ? 'Elevated E.coli levels detected' : null,
      sampleDate: new Date(now.getTime() - 86400000 * Math.floor(Math.random() * 7)).toISOString(),
      fetchedAt: new Date().toISOString(),
    };
  }, WATER_QUALITY_CACHE_TTL);
}
