import type { WaterQualityLevel, WaterQualityStatus } from '@van-beaches/shared';
import { createSuccessResponse, getBeachById } from '@van-beaches/shared';
import { AppError } from '../../_middleware';

interface Env {
  BEACH_CACHE: KVNamespace;
}

const WATER_QUALITY_TTL_SECONDS = 21600; // 6 hours

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const beachId = context.params.beachId as string;
  const beach = getBeachById(beachId);
  if (!beach) throw new AppError('NOT_FOUND', `Beach not found: ${beachId}`);

  const cacheKey = `waterquality:${beachId}`;
  const cached = await context.env.BEACH_CACHE.get(cacheKey);

  if (cached) {
    const data: WaterQualityStatus = JSON.parse(cached);
    return Response.json(createSuccessResponse(data, true, data.fetchedAt));
  }

  // Cache miss: generate synthetic data
  const status = generateWaterQualityStatus(beachId);

  await context.env.BEACH_CACHE.put(cacheKey, JSON.stringify(status), {
    expirationTtl: WATER_QUALITY_TTL_SECONDS,
  });

  return Response.json(createSuccessResponse(status, true, status.fetchedAt));
};

function generateWaterQualityStatus(beachId: string): WaterQualityStatus {
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
    ecoliCount:
      randomLevel === 'good'
        ? Math.floor(Math.random() * 100)
        : Math.floor(Math.random() * 300) + 200,
    advisoryReason: randomLevel === 'advisory' ? 'Elevated E.coli levels detected' : null,
    sampleDate: new Date(now.getTime() - 86400000 * Math.floor(Math.random() * 7)).toISOString(),
    fetchedAt: new Date().toISOString(),
  };
}
