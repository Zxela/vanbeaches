import type { WeatherCondition } from './weather.js';
import type { WaterQualityLevel } from './waterQuality.js';

export interface Beach {
  id: string;
  name: string;
  slug: string;
  location: { latitude: number; longitude: number };
  tideStationId: string | null;
  hasWebcam: boolean;
  webcamUrl: string | null;
}

export interface BeachSummary {
  id: string;
  name: string;
  currentWeather: { temperature: number; condition: WeatherCondition; icon: string } | null;
  nextTide: { type: 'high' | 'low'; time: string; height: number } | null;
  waterQuality: WaterQualityLevel;
  lastUpdated: string;
}

export function isBeach(value: unknown): value is Beach {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.slug === 'string' &&
    typeof obj.location === 'object' &&
    obj.location !== null &&
    (obj.tideStationId === null || typeof obj.tideStationId === 'string') &&
    typeof obj.hasWebcam === 'boolean' &&
    (obj.webcamUrl === null || typeof obj.webcamUrl === 'string')
  );
}
