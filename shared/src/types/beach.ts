import type { WaterQualityLevel } from './waterQuality.js';
import type { WeatherCondition } from './weather.js';

export interface BeachAmenities {
  parking: 'free' | 'paid' | 'street' | 'none';
  restrooms: boolean;
  showers: boolean;
  lifeguard: 'seasonal' | 'year-round' | 'none';
  foodNearby: boolean;
  dogFriendly: boolean;
  wheelchairAccessible: boolean;
  volleyballCourts: number;
  firepits: boolean;
}

export interface Beach {
  id: string;
  name: string;
  slug: string;
  location: { latitude: number; longitude: number };
  tideStationId: string | null;
  hasWebcam: boolean;
  webcamUrl: string | null;
  photoUrl?: string;
  photoCredit?: string;
  photoCreditUrl?: string;
  description?: string;
  amenities?: BeachAmenities;
  activities?: string[];
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
