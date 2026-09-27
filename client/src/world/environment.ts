import type {
  EnvironmentData,
  EnvironmentalState,
  EnvironmentalWeather,
  TideSample,
} from '@van-beaches/shared';
import { solarPosition } from './solar';

const HOUR = 3600000;
export const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const age = (time: string | null | undefined, now: number) =>
  time ? now - Date.parse(time) : Number.POSITIVE_INFINITY;

function bracket<T extends { time: string }>(
  samples: T[],
  timestamp: number,
  maxGap: number,
): [T, T, number] | null {
  const right = samples.findIndex((sample) => Date.parse(sample.time) >= timestamp);
  if (right < 0) return null;
  const b = samples[right];
  if (Date.parse(b.time) === timestamp) return [b, b, 0];
  const a = samples[right - 1];
  if (!a) return null;
  const gap = Date.parse(b.time) - Date.parse(a.time);
  if (gap <= 0 || gap > maxGap) return null;
  return [a, b, (timestamp - Date.parse(a.time)) / gap];
}

export function predictedTide(samples: TideSample[], timestamp: number) {
  const pair = bracket(samples, timestamp, HOUR);
  return pair ? mix(pair[0].heightCD, pair[1].heightCD, pair[2]) : null;
}

export function normalizeEnvironment(
  data: EnvironmentData | null,
  timestamp: number,
  mode: EnvironmentalState['mode'],
  location: { latitude: number; longitude: number },
  neutralTide = 3,
  now = Date.now(),
): EnvironmentalState {
  const series = data?.tide;
  const observation =
    mode === 'LIVE'
      ? series?.observations
          .filter((s) => {
            const elapsed = timestamp - Date.parse(s.time);
            return elapsed >= 0 && elapsed <= 20 * 60000 && s.qcFlag === '1';
          })
          .at(-1)
      : undefined;
  const predicted = predictedTide(series?.predictions ?? [], timestamp);
  const last = [...(series?.observations ?? []), ...(series?.predictions ?? [])]
    .filter((s) => Date.parse(s.time) <= timestamp && age(s.time, timestamp) <= 7 * 24 * HOUR)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    .at(-1);
  const source = observation
    ? 'observed'
    : predicted !== null
      ? 'predicted'
      : last
        ? 'last-known'
        : 'neutral';
  const tideFetchedAt =
    observation || (source === 'last-known' && last && series?.observations.includes(last))
      ? series?.observationsFetchedAt
      : series?.predictionsFetchedAt;

  const current = data?.weather.current;
  const pair = bracket(data?.weather.hourly ?? [], timestamp, 2 * HOUR);
  let weather: EnvironmentalWeather = {
    time: new Date(timestamp).toISOString(),
    temperature: 15,
    condition: 'partly-cloudy',
    cloudCover: 35,
    precipitation: 0,
    rain: 0,
    windSpeed: 8,
    windDirection: 270,
    visibility: null,
  };
  let weatherSource: EnvironmentalState['weather']['source'] = 'neutral';
  if (mode === 'LIVE' && current && Math.abs(age(current.time, timestamp)) < 45 * 60000) {
    weather = current;
    weatherSource = 'current-model';
  } else if (pair) {
    const [a, b, t] = pair;
    const directionDelta = ((b.windDirection - a.windDirection + 540) % 360) - 180;
    weather = {
      time: new Date(timestamp).toISOString(),
      temperature: mix(a.temperature, b.temperature, t),
      condition: t < 0.5 ? a.condition : b.condition,
      cloudCover: mix(a.cloudCover, b.cloudCover, t),
      precipitation: mix(a.precipitation, b.precipitation, t),
      rain: mix(a.rain, b.rain, t),
      windSpeed: mix(a.windSpeed, b.windSpeed, t),
      windDirection: (a.windDirection + directionDelta * t + 360) % 360,
      visibility:
        a.visibility !== null && b.visibility !== null ? mix(a.visibility, b.visibility, t) : null,
    };
    weatherSource = timestamp < now ? 'past-model' : 'forecast';
  } else if (current && Math.abs(age(current.time, timestamp)) < 6 * HOUR) {
    weather = current;
    weatherSource = 'last-known';
  }
  return {
    timestamp: new Date(timestamp).toISOString(),
    mode,
    tide: {
      heightCD: observation?.heightCD ?? predicted ?? last?.heightCD ?? neutralTide,
      observed: !!observation,
      source,
      sampleTime:
        observation?.time ??
        (predicted !== null ? new Date(timestamp).toISOString() : (last?.time ?? null)),
      fetchedAt: tideFetchedAt ?? null,
      stale:
        source === 'neutral' ||
        source === 'last-known' ||
        age(tideFetchedAt, now) > (observation ? 15 * 60000 : 2 * HOUR),
      nextHigh:
        series?.extremes.find((s) => s.type === 'high' && Date.parse(s.time) > timestamp) ?? null,
      nextLow:
        series?.extremes.find((s) => s.type === 'low' && Date.parse(s.time) > timestamp) ?? null,
    },
    sun: solarPosition(timestamp, location.latitude, location.longitude),
    weather: {
      ...weather,
      source: weatherSource,
      fetchedAt: data?.weather.fetchedAt ?? null,
      stale:
        weatherSource === 'neutral' ||
        weatherSource === 'last-known' ||
        age(data?.weather.fetchedAt, now) > 90 * 60000,
    },
  };
}

// Artistic response, deliberately independent from raw units. NOT a wave forecast.
export const ENVIRONMENT_TUNING = {
  windFullScaleKmh: 45,
  amplitudeMin: 0.025,
  amplitudeMax: 0.16,
  speedMin: 0.12,
  speedMax: 0.85,
  liveTideSeconds: 8,
  timelineTideSeconds: 0.65,
  maxRainParticles: 700,
  mobileRainParticles: 140,
};
export function visualWeather(weather: EnvironmentalWeather) {
  const wind = clamp(weather.windSpeed / ENVIRONMENT_TUNING.windFullScaleKmh, 0, 1);
  const rain = clamp(weather.rain / 4, 0, 1);
  // Ordinary overcast retains long views; only actual fog/low visibility warrants heavy haze.
  const visibility =
    weather.visibility ?? (weather.condition === 'foggy' ? 5000 : weather.rain > 0 ? 18000 : 40000);
  return {
    amplitude: mix(ENVIRONMENT_TUNING.amplitudeMin, ENVIRONMENT_TUNING.amplitudeMax, wind),
    speed: mix(ENVIRONMENT_TUNING.speedMin, ENVIRONMENT_TUNING.speedMax, wind),
    roughness: mix(0.12, 0.6, wind) + rain * 0.08,
    wind,
    rain,
    haze: 1 / clamp(visibility, 350, 80000),
    // FROM bearing -> direction of travel; world +X east, +Z south.
    direction: {
      x: -Math.sin((weather.windDirection * Math.PI) / 180),
      y: Math.cos((weather.windDirection * Math.PI) / 180),
    },
  };
}

export function smoothTide(
  previous: number,
  target: number,
  dt: number,
  mode: EnvironmentalState['mode'],
) {
  return mix(
    previous,
    target,
    1 -
      Math.exp(
        -Math.max(0, dt) /
          (mode === 'LIVE'
            ? ENVIRONMENT_TUNING.liveTideSeconds
            : ENVIRONMENT_TUNING.timelineTideSeconds),
      ),
  );
}
