import type { EnvironmentalState } from '@van-beaches/shared';
import { clamp } from '../environment';
import { solarTimes } from '../solar';
import baselines from './crowd-baselines.json';

export type CrowdCategory = 'quiet' | 'moderate' | 'busy' | 'very busy';
export interface CrowdState {
  estimatedPeople: number;
  normalizedDensity: number;
  category: CrowdCategory;
  confidence: 'low';
  basis: 'environment-model' | 'limited-data';
  factors: Record<string, number>;
  modelVersion: number;
}
export type BeachBaseline = (typeof baselines.beaches)['kitsilano-beach'] & {
  weekdayCurve?: number[];
  weekendCurve?: number[];
};
export const CROWD_BASELINES = baselines;
export function beachBaseline(id: string): BeachBaseline | undefined {
  return (baselines.beaches as Record<string, BeachBaseline>)[id];
}

const calendar = new Intl.DateTimeFormat('en-CA', {
  timeZone: baselines.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
export function localCalendar(timestamp: string) {
  const parts = Object.fromEntries(
    calendar.formatToParts(new Date(timestamp)).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    month: Number(parts.month),
    hour: Number(parts.hour) + Number(parts.minute) / 60,
    weekend: parts.weekday === 'Sat' || parts.weekday === 'Sun',
  };
}
function response(value: number, knots: number[][]) {
  if (!Number.isFinite(value)) return 1;
  if (value <= knots[0][0]) return knots[0][1];
  for (let i = 1; i < knots.length; i++) {
    const [x, y] = knots[i];
    const [px, py] = knots[i - 1];
    if (value <= x) return py + ((y - py) * (value - px)) / (x - px);
  }
  return knots[knots.length - 1][1];
}
export function crowdCategory(density: number): CrowdCategory {
  const t = baselines.thresholds;
  return density >= t.veryBusy
    ? 'very busy'
    : density >= t.busy
      ? 'busy'
      : density >= t.moderate
        ? 'moderate'
        : 'quiet';
}

/** Pure, inspectable estimate. No observed attendance or popularity service is involved. */
export function estimateCrowd(
  beachId: string,
  state: EnvironmentalState,
  location: { latitude: number; longitude: number },
  options: { holiday?: boolean; baseline?: BeachBaseline } = {},
): CrowdState | null {
  const beach = options.baseline ?? beachBaseline(beachId);
  if (!beach || !Number.isFinite(Date.parse(state.timestamp))) return null;
  const local = localCalendar(state.timestamp);
  const holiday = options.holiday ?? (baselines.holidayDates as string[]).includes(local.date);
  const curve =
    local.weekend || holiday
      ? (beach.weekendCurve ?? baselines.curves.weekend)
      : (beach.weekdayCurve ?? baselines.curves.weekday);
  const hour = Math.floor(local.hour);
  const hourly = curve[hour] + (curve[(hour + 1) % 24] - curve[hour]) * (local.hour - hour);
  const m = baselines.modifiers;
  // Use Vancouver local noon so UTC-midnight does not select the wrong solar day.
  const noon = new Date(`${local.date}T12:00:00-08:00`);
  const sunset = solarTimes(noon, location.latitude, location.longitude).sunset.getTime();
  const sunsetProximity = Math.max(
    0,
    1 - Math.abs(Date.parse(state.timestamp) - sunset) / (m.sunsetWindowMinutes * 60000),
  );
  const weather = state.weather;
  const neutral = weather.source === 'neutral';
  const factors = {
    hourly,
    season: m.season[local.month - 1],
    baseline: beach.baselineScale,
    temperature: neutral ? 1 : response(weather.temperature, m.temperature),
    precipitation: neutral ? 1 : response(weather.precipitation, m.precipitation),
    wind: neutral ? 1 : response(weather.windSpeed, m.wind),
    cloud: neutral ? 1 : 1 - (clamp(weather.cloudCover, 0, 100) / 100) * m.cloudPenalty,
    daylight: state.sun.elevation < m.nightElevation ? m.nightFactor : 1,
    sunset: 1 + sunsetProximity * beach.sunsetBoost,
    tide:
      beach.tidal && !state.tide.stale && state.tide.heightCD < m.lowTideCD ? m.lowTideBoost : 1,
    calibration: beach.calibrationScale,
  };
  const normalizedDensity = clamp(
    Object.values(factors).reduce((a, b) => a * b, 1),
    0,
    1,
  );
  return {
    estimatedPeople:
      Math.round((normalizedDensity * beach.capacityEstimate) / m.peopleRounding) *
      m.peopleRounding,
    normalizedDensity,
    category: crowdCategory(normalizedDensity),
    confidence: 'low',
    basis:
      weather.stale || weather.source === 'neutral' || (beach.tidal && state.tide.stale)
        ? 'limited-data'
        : 'environment-model',
    factors,
    modelVersion: baselines.version,
  };
}
