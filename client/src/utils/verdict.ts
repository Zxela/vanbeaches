import type { TideData, WaterQualityLevel, WaterQualityStatus, WeatherCondition, WeatherForecast } from '@van-beaches/shared';

export interface BeachVerdict {
  recommendation: 'perfect' | 'good' | 'fair' | 'skip';
  summary: string;
  bestTimeWindow: string;
  reasons: string[];
  suggestion: string;
}

/**
 * Synthesizes weather, tide, water quality, and sunset data into a
 * narrative beach recommendation.
 *
 * @param weather - Current weather forecast (required)
 * @param tides - Tide predictions (optional)
 * @param waterQuality - Water quality status (optional)
 * @param sunsetTime - ISO string of today's sunset time (optional)
 */
export function computeVerdict(
  weather: WeatherForecast,
  tides: TideData | null,
  waterQuality: WaterQualityStatus | null,
  sunsetTime: string | null,
): BeachVerdict {
  const { condition, temperature, windSpeed, uvIndex } = weather.current;

  // --- Determine recommendation tier ---
  const recommendation = determineRecommendation(
    condition,
    temperature,
    windSpeed,
    uvIndex,
    waterQuality,
  );

  // --- Build reasons array (2-4 factors) ---
  const reasons = buildReasons(condition, temperature, windSpeed, uvIndex, tides, sunsetTime);

  // --- Calculate best time window ---
  const bestTimeWindow = computeBestTimeWindow(tides, sunsetTime);

  // --- Build editorial summary ---
  const summary = buildSummary(
    recommendation,
    condition,
    temperature,
    windSpeed,
    tides,
    sunsetTime,
  );

  // --- Build actionable suggestion ---
  const suggestion = buildSuggestion(recommendation, bestTimeWindow, tides, sunsetTime);

  return { recommendation, summary, bestTimeWindow, reasons, suggestion };
}

function determineRecommendation(
  condition: WeatherForecast['current']['condition'],
  temperature: number,
  windSpeed: number,
  uvIndex: number,
  waterQuality: WaterQualityStatus | null,
): BeachVerdict['recommendation'] {
  // Skip: stormy always, or rainy + high winds (>= 20 kph)
  if (condition === 'stormy') return 'skip';
  if (condition === 'rainy' && windSpeed >= 20) return 'skip';

  // Perfect: sunny, temp >= 20, wind < 15, UV 3-6, water quality good
  const waterGood = !waterQuality || waterQuality.level === 'good';
  if (
    condition === 'sunny' &&
    temperature >= 20 &&
    windSpeed < 15 &&
    uvIndex >= 3 &&
    uvIndex <= 6 &&
    waterGood
  ) {
    return 'perfect';
  }

  // Fair: rainy (with low winds), cloudy + cold, advisory water quality, strong winds
  const waterAdverse =
    waterQuality && (waterQuality.level === 'advisory' || waterQuality.level === 'closed');
  if (
    condition === 'rainy' ||
    (condition === 'cloudy' && temperature < 16) ||
    waterAdverse ||
    windSpeed >= 25
  ) {
    return 'fair';
  }

  return 'good';
}

function buildReasons(
  condition: WeatherForecast['current']['condition'],
  temperature: number,
  windSpeed: number,
  uvIndex: number,
  tides: TideData | null,
  sunsetTime: string | null,
): string[] {
  // Prioritized reasons: tide and sunset always go first if present,
  // then fill remaining slots with weather factors (up to 4 total).

  const priorityReasons: string[] = [];
  const weatherReasons: string[] = [];

  // Priority 1: Next high tide (always include if available)
  const nextHighTide = getNextHighTide(tides);
  if (nextHighTide) {
    const tideHour = formatHour(new Date(nextHighTide.time));
    priorityReasons.push(`High tide at ${tideHour}`);
  }

  // Priority 2: Golden hour / sunset (always include if within 8 hours)
  if (sunsetTime) {
    const sunsetDate = new Date(sunsetTime);
    const hoursUntilSunset = (sunsetDate.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilSunset > 0 && hoursUntilSunset <= 8) {
      const sunsetHour = formatHour(sunsetDate);
      priorityReasons.push(`Golden hour sunset at ${sunsetHour}`);
    }
  }

  // Weather condition
  if (condition === 'sunny') {
    weatherReasons.push('Sunny skies');
  } else if (condition === 'partly-cloudy') {
    weatherReasons.push('Partly cloudy');
  }

  // Wind
  if (windSpeed < 15) {
    weatherReasons.push('Calm winds');
  } else if (windSpeed >= 25) {
    weatherReasons.push(`Strong winds (${windSpeed} km/h)`);
  }

  // Temperature
  if (temperature >= 22) {
    weatherReasons.push(`Warm ${temperature}°C`);
  } else if (temperature >= 18) {
    weatherReasons.push(`Pleasant ${temperature}°C`);
  }

  // UV
  if (uvIndex >= 3 && uvIndex <= 6) {
    weatherReasons.push('Moderate UV');
  } else if (uvIndex > 8) {
    weatherReasons.push('Very high UV — sunscreen essential');
  }

  // Combine: priority first, then weather — cap at 4
  const combined = [...priorityReasons, ...weatherReasons].slice(0, 4);

  // Ensure at least 2 reasons
  return combined.length >= 2 ? combined : ensureMinReasons(combined, condition, windSpeed);
}

function ensureMinReasons(reasons: string[], condition: string, windSpeed: number): string[] {
  const padded = [...reasons];
  if (padded.length < 2) {
    if (!padded.some((r) => /wind/i.test(r))) {
      padded.push(windSpeed < 15 ? 'Calm winds' : `Wind at ${windSpeed} km/h`);
    }
    if (padded.length < 2) {
      padded.push(condition === 'stormy' ? 'Storm warning' : 'Check conditions before heading out');
    }
  }
  return padded.slice(0, 4);
}

function computeBestTimeWindow(tides: TideData | null, sunsetTime: string | null): string {
  const nextHighTide = getNextHighTide(tides);
  const sunsetDate = sunsetTime ? new Date(sunsetTime) : null;

  // Use high tide as anchor if within the next 8 hours
  if (nextHighTide) {
    const tideDate = new Date(nextHighTide.time);
    const hoursUntilTide = (tideDate.getTime() - Date.now()) / (60 * 60 * 1000);

    if (hoursUntilTide > 0 && hoursUntilTide <= 8) {
      // Best window: 1 hour before to 1 hour after high tide
      const windowStart = new Date(tideDate.getTime() - 60 * 60 * 1000);
      const windowEnd = new Date(tideDate.getTime() + 60 * 60 * 1000);
      return `${formatHour(windowStart)}–${formatHour(windowEnd)}`;
    }
  }

  // Use sunset as anchor if within the next 8 hours
  if (sunsetDate) {
    const hoursUntilSunset = (sunsetDate.getTime() - Date.now()) / (60 * 60 * 1000);
    if (hoursUntilSunset > 0 && hoursUntilSunset <= 8) {
      const windowStart = new Date(sunsetDate.getTime() - 2 * 60 * 60 * 1000);
      const windowEnd = sunsetDate;
      return `${formatHour(windowStart)}–${formatHour(windowEnd)}`;
    }
  }

  // Default: suggest afternoon
  return 'This afternoon';
}

function buildSummary(
  recommendation: BeachVerdict['recommendation'],
  condition: WeatherForecast['current']['condition'],
  _temperature: number,
  windSpeed: number,
  tides: TideData | null,
  sunsetTime: string | null,
): string {
  const nextHighTide = getNextHighTide(tides);
  const hasSunset =
    sunsetTime && (new Date(sunsetTime).getTime() - Date.now()) / (60 * 60 * 1000) > 0;

  if (recommendation === 'perfect') {
    if (nextHighTide && hasSunset) {
      const tideHour = formatHour(new Date(nextHighTide.time));
      return `Perfect afternoon ahead. High tide meets golden hour around ${tideHour}.`;
    }
    if (nextHighTide) {
      return 'Perfect beach day. Sunny skies, calm winds, and high tide on its way.';
    }
    return 'Perfect conditions. Warm, sunny, and calm — an ideal beach day.';
  }

  if (recommendation === 'good') {
    if (condition === 'sunny') {
      return 'Good day for the beach. Sunny with comfortable temperatures.';
    }
    return 'Decent beach conditions today. Worth the trip.';
  }

  if (recommendation === 'fair') {
    if (condition === 'rainy') {
      return 'Rain expected today. May want to wait for a clearer window.';
    }
    if (windSpeed >= 25) {
      return 'Windy conditions today. Great for flying a kite, less ideal for sunbathing.';
    }
    return 'Fair conditions. Check the forecast before heading out.';
  }

  // skip
  if (condition === 'stormy') {
    return 'Storm conditions — stay home today. Check back tomorrow.';
  }
  return 'Not a beach day. Rain and strong winds make for rough conditions.';
}

function buildSuggestion(
  recommendation: BeachVerdict['recommendation'],
  bestTimeWindow: string,
  tides: TideData | null,
  sunsetTime: string | null,
): string {
  const nextHighTide = getNextHighTide(tides);

  if (recommendation === 'perfect') {
    if (nextHighTide) {
      const tideHour = formatHour(new Date(nextHighTide.time));
      return `Pack a picnic and head down around ${tideHour}.`;
    }
    return `Head down during ${bestTimeWindow} for the best experience.`;
  }

  if (recommendation === 'good') {
    return `A great time to visit. Aim for ${bestTimeWindow}.`;
  }

  if (recommendation === 'fair') {
    if (sunsetTime) {
      const sunsetHour = formatHour(new Date(sunsetTime));
      return `If you go, try to catch golden hour around ${sunsetHour}.`;
    }
    return 'Consider waiting for better conditions, or dress for the weather.';
  }

  // skip
  return 'Skip it today and check back for a better window.';
}

/**
 * Derives a verdict recommendation from BeachSummary data.
 * Uses only weather condition + temperature + water quality (no wind/UV).
 */
export function computeSummaryVerdict(
  weather: { temperature: number; condition: WeatherCondition } | null,
  waterQuality: WaterQualityLevel,
): BeachVerdict['recommendation'] {
  if (!weather) return 'good';
  const { condition, temperature } = weather;
  if (condition === 'stormy') return 'skip';
  if (condition === 'rainy') return 'fair';
  const waterGood = waterQuality === 'good' || waterQuality === 'unknown' || waterQuality === 'off-season';
  if (condition === 'sunny' && temperature >= 20 && waterGood) return 'perfect';
  if ((condition === 'cloudy' && temperature < 16) || waterQuality === 'closed' || waterQuality === 'advisory') return 'fair';
  return 'good';
}

// --- Utility helpers ---

function getNextHighTide(tides: TideData | null): TideData['predictions'][0] | null {
  if (!tides?.predictions?.length) return null;
  const now = Date.now();
  const upcoming = tides.predictions
    .filter((p) => p.type === 'high' && new Date(p.time).getTime() > now)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  return upcoming[0] ?? null;
}

function formatHour(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  if (minutes === 0) return `${hour12}${period}`;
  return `${hour12}:${String(minutes).padStart(2, '0')}${period}`;
}
