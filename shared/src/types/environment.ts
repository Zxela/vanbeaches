import type { TidePrediction } from './tide.js';
import type { WeatherCondition } from './weather.js';

export const VANCOUVER_TIDE_STATION = '5cebf1de3d0f4a073c4bb943'; // CHS 07735
export interface TideSample {
  time: string;
  heightCD: number;
  qcFlag?: string;
}
export interface TideSeries {
  stationCode: '07735';
  stationId: string;
  predictions: TideSample[];
  observations: TideSample[];
  extremes: TidePrediction[];
  predictionsFetchedAt: string | null;
  observationsFetchedAt: string | null;
}
export interface EnvironmentalWeather {
  time: string;
  temperature: number;
  condition: WeatherCondition;
  cloudCover: number; // percent
  precipitation: number; // mm/h equivalent rate; current totals scaled by their reported interval
  rain: number; // liquid precipitation rate, mm/h; excludes snow
  windSpeed: number; // km/h
  windDirection: number; // meteorological FROM, clockwise degrees from true north
  visibility: number | null; // metres
}
export interface EnvironmentData {
  version: 1;
  beachId: string;
  latitude: number;
  longitude: number;
  tide: TideSeries;
  weather: {
    current: EnvironmentalWeather | null;
    hourly: EnvironmentalWeather[];
    fetchedAt: string | null;
  };
}
export interface EnvironmentalState {
  timestamp: string;
  mode: 'LIVE' | 'TIMELINE';
  tide: {
    heightCD: number;
    observed: boolean;
    source: 'observed' | 'predicted' | 'last-known' | 'neutral';
    sampleTime: string | null;
    fetchedAt: string | null;
    stale: boolean;
    nextHigh: TidePrediction | null;
    nextLow: TidePrediction | null;
  };
  sun: { elevation: number; azimuth: number }; // degrees; clockwise from north
  weather: EnvironmentalWeather & {
    source: 'current-model' | 'forecast' | 'past-model' | 'last-known' | 'neutral';
    fetchedAt: string | null;
    stale: boolean;
  };
}

// API and persisted browser data are untrusted, including older/corrupt cache entries.
export function isEnvironmentData(value: unknown): value is EnvironmentData {
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
  const finite = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const time = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
  const optionalTime = (v: unknown) => v === null || time(v);
  const sample = (v: unknown) => object(v) && time(v.time) && finite(v.heightCD);
  const weather = (v: unknown) =>
    object(v) &&
    time(v.time) &&
    ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'stormy', 'foggy'].includes(
      String(v.condition),
    ) &&
    ['temperature', 'cloudCover', 'precipitation', 'rain', 'windSpeed', 'windDirection'].every(
      (key) => finite(v[key]),
    ) &&
    (v.visibility === null || finite(v.visibility));
  if (
    !object(value) ||
    value.version !== 1 ||
    typeof value.beachId !== 'string' ||
    !finite(value.latitude) ||
    !finite(value.longitude) ||
    !object(value.tide) ||
    !object(value.weather)
  )
    return false;
  const tide = value.tide;
  return (
    tide.stationCode === '07735' &&
    Array.isArray(tide.predictions) &&
    tide.predictions.every(sample) &&
    Array.isArray(tide.observations) &&
    tide.observations.every(sample) &&
    Array.isArray(tide.extremes) &&
    tide.extremes.every(
      (v) =>
        object(v) && time(v.time) && finite(v.height) && (v.type === 'high' || v.type === 'low'),
    ) &&
    optionalTime(tide.predictionsFetchedAt) &&
    optionalTime(tide.observationsFetchedAt) &&
    (value.weather.current === null || weather(value.weather.current)) &&
    Array.isArray(value.weather.hourly) &&
    value.weather.hourly.every(weather) &&
    optionalTime(value.weather.fetchedAt)
  );
}
