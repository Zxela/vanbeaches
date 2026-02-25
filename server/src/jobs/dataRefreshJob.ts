import { BEACHES } from '@van-beaches/shared';
import { getTidePredictions } from '../services/iwlsService.js';
import { getWaterQuality } from '../services/waterQualityService.js';
import { getWeatherForecast } from '../services/weatherService.js';
import { scheduleJob } from './scheduler.js';

export function setupDataRefreshJobs(): void {
  // Refresh weather every 30 minutes
  scheduleJob('weather-refresh', '*/30 * * * *', async () => {
    for (const beach of BEACHES) {
      try {
        await getWeatherForecast(beach.id, beach.location.latitude, beach.location.longitude);
      } catch (e) {
        console.error(`Weather refresh failed for ${beach.id}`, e);
      }
    }
  });

  // Refresh water quality every 6 hours
  scheduleJob('water-quality-refresh', '0 */6 * * *', async () => {
    for (const beach of BEACHES) {
      try {
        await getWaterQuality(beach.id);
      } catch (e) {
        console.error(`Water quality refresh failed for ${beach.id}`, e);
      }
    }
  });

  // Refresh tide data every hour (deduplicated by stationId)
  scheduleJob('tide-refresh', '0 * * * *', async () => {
    const seenStationIds = new Set<string>();
    for (const beach of BEACHES) {
      if (!beach.tideStationId) continue;
      if (seenStationIds.has(beach.tideStationId)) continue;
      seenStationIds.add(beach.tideStationId);
      try {
        await getTidePredictions(beach.tideStationId, beach.id, beach.name);
      } catch (e) {
        console.error(`Tide refresh failed for station ${beach.tideStationId}`, e);
      }
    }
  });
}
