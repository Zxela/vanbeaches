import { BEACHES } from '@van-beaches/shared';
import { fetchTidesForStation } from './services/iwlsService';
import { fetchWaterQualityForBeach } from './services/waterQualityService';
import { fetchWeatherForBeach } from './services/weatherService';

export interface Env {
  BEACH_CACHE: KVNamespace;
}

async function refreshWeather(kv: KVNamespace): Promise<void> {
  for (const beach of BEACHES) {
    try {
      await fetchWeatherForBeach(kv, beach.id, beach.location.latitude, beach.location.longitude);
    } catch (e) {
      console.error(`Weather refresh failed for ${beach.id}`, e);
    }
  }
}

async function refreshTides(kv: KVNamespace): Promise<void> {
  const seenStationIds = new Set<string>();
  for (const beach of BEACHES) {
    if (!beach.tideStationId) continue;
    if (seenStationIds.has(beach.tideStationId)) continue;
    seenStationIds.add(beach.tideStationId);
    try {
      await fetchTidesForStation(kv, beach.tideStationId, beach.id, beach.name);
    } catch (e) {
      console.error(`Tide refresh failed for station ${beach.tideStationId}`, e);
    }
  }
}

async function refreshWaterQuality(kv: KVNamespace): Promise<void> {
  for (const beach of BEACHES) {
    try {
      await fetchWaterQualityForBeach(kv, beach.id);
    } catch (e) {
      console.error(`Water quality refresh failed for ${beach.id}`, e);
    }
  }
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const task = async () => {
      switch (event.cron) {
        case '*/30 * * * *':
          console.log('Cron triggered: weather refresh');
          await refreshWeather(env.BEACH_CACHE);
          break;
        case '0 * * * *':
          console.log('Cron triggered: tide refresh');
          await refreshTides(env.BEACH_CACHE);
          break;
        case '0 */6 * * *':
          console.log('Cron triggered: water quality refresh');
          await refreshWaterQuality(env.BEACH_CACHE);
          break;
        default:
          console.log(`Unknown cron pattern: ${event.cron}`);
      }
    };

    ctx.waitUntil(task());
  },
};
