import type { Beach, TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { Compass, Droplets, Eye, Sunrise, Sunset, Waves } from 'lucide-react';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';
import { getWaterQualityBgColor, getWaterQualityTextLabel } from '../lib/waterQualityColors';
import { ActivityRecommendations } from './ActivityRecommendations';
import { BeachVerdict } from './BeachVerdict';
import { ErrorState } from './ErrorState';
import { HourlyForecast } from './HourlyForecast';
import { TideCanvas } from './TideCanvas';
import { WeatherForecast as WeatherForecastWidget } from './WeatherForecast';

interface TodayTabProps {
  beach: Beach;
  weather: WeatherForecast | null;
  tides: TideData | null;
  waterQuality: WaterQualityStatus | null;
  sunsetTime: string | null;
  weatherError?: string | null;
  onRetryWeather?: () => void;
  tideError?: string | null;
  onRetryTide?: () => void;
  waterQualityError?: string | null;
  onRetryWaterQuality?: () => void;
}

function getUvLabel(uvIndex: number): string {
  if (uvIndex <= 2) return 'Low';
  if (uvIndex <= 5) return 'Moderate';
  if (uvIndex <= 7) return 'High';
  if (uvIndex <= 10) return 'Very High';
  return 'Extreme';
}

function getUpdatedMinutesAgo(fetchedAt: string): number {
  const fetched = new Date(fetchedAt).getTime();
  const now = Date.now();
  return Math.floor((now - fetched) / 60000);
}

export function TodayTab({
  beach,
  weather,
  tides,
  waterQuality,
  sunsetTime,
  weatherError,
  onRetryWeather,
  tideError,
  onRetryTide,
  waterQualityError,
  onRetryWaterQuality,
}: TodayTabProps) {
  const showTides = beach.tideStationId !== null && tides !== null;
  const showTideError = beach.tideStationId !== null && tideError && !tides;
  const sunTimes = useSunTimes(beach.location.latitude, beach.location.longitude);

  return (
    <div className="space-y-3 pb-8 pt-3">
      {/* BeachVerdict — top of the tab */}
      {weather && (
        <BeachVerdict
          weather={weather}
          tides={tides}
          waterQuality={waterQuality}
          sunsetTime={sunsetTime}
        />
      )}

      {/* Weather error state */}
      {weatherError && !weather && (
        <ErrorState message="Couldn't load conditions" onRetry={onRetryWeather} variant="weather" />
      )}

      {waterQualityError && !waterQuality && (
        <ErrorState
          message="Water quality data unavailable"
          onRetry={onRetryWaterQuality}
          variant="weather"
        />
      )}

      {/* Compact conditions grid */}
      {weather && <HourlyForecast forecast={weather} />}

      {weather && (
        <section className="weather-panel">
          <div className="weather-panel-title justify-between">
            <h2 className="font-display">Conditions</h2>
            <span className="text-[10px] font-medium normal-case tracking-normal text-white/50">
              Updated {getUpdatedMinutesAgo(weather.fetchedAt)} min ago
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3">
            {/* Temperature */}
            <div className="border-b border-r border-white/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                Feels like
              </p>
              <p className="mt-2 text-xl font-bold text-white">
                {Math.round(weather.current.apparentTemperature ?? weather.current.temperature)}°
              </p>
              <p className="mt-1 text-xs capitalize text-white/65">
                {weather.current.apparentTemperature === undefined
                  ? 'Based on current temperature'
                  : `Actual temperature ${Math.round(weather.current.temperature)}°`}
              </p>
            </div>

            {/* Wind */}
            <div className="border-b border-white/15 p-4 sm:border-r">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/55">
                <Compass className="h-3.5 w-3.5" /> Wind
              </p>
              <p className="mt-2 text-xl font-bold text-white">{weather.current.windSpeed} km/h</p>
              <p className="mt-1 text-xs text-white/65">
                From {weather.current.windDirection}
                {weather.current.windGusts !== undefined
                  ? ` · Gusts ${Math.round(weather.current.windGusts)} km/h`
                  : ''}
              </p>
            </div>

            {/* UV Index */}
            <div className="border-b border-r border-white/15 p-4 sm:border-r-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-white/55">
                UV Index
              </p>
              <p className="mt-2 text-xl font-bold text-white">UV {weather.current.uvIndex}</p>
              <p className="mt-1 text-xs text-white/65">
                {getUvLabel(weather.current.uvIndex)} exposure
              </p>
            </div>

            {/* Water Quality */}
            {waterQuality && (
              <div className="border-b border-white/15 p-4 sm:border-b-0 sm:border-r">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/55">
                  <Droplets className="h-3.5 w-3.5" /> Water
                </p>
                <span
                  data-testid="water-quality-label"
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getWaterQualityBgColor(waterQuality.level)}`}
                >
                  {getWaterQualityTextLabel(waterQuality.level)}
                </span>
              </div>
            )}

            <div className="border-r border-white/15 p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-white/55">
                <Eye className="h-3.5 w-3.5" /> Visibility
              </p>
              <p className="mt-2 text-xl font-bold text-white">
                {weather.current.visibility !== undefined
                  ? `${Math.round(weather.current.visibility / 1000)} km`
                  : `${weather.current.humidity}%`}
              </p>
              <p className="mt-1 text-xs text-white/65">
                {weather.current.visibility !== undefined
                  ? `${weather.current.humidity}% humidity`
                  : 'Current relative humidity'}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="weather-panel" aria-labelledby="sun-times-heading">
        <div className="weather-panel-title">
          <Sunrise className="h-4 w-4" />
          <h2 id="sun-times-heading">Sun Times</h2>
        </div>
        <div className="grid grid-cols-2 divide-x divide-white/15 p-4">
          <div className="flex items-center gap-3">
            <Sunrise className="h-7 w-7 text-amber-200" />
            <div>
              <p className="text-xs text-white/55">Sunrise</p>
              <p className="text-lg font-semibold">
                {formatSunTime(weather?.daily?.[0]?.sunrise ?? sunTimes.sunrise)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3">
            <Sunset className="h-7 w-7 text-orange-200" />
            <div>
              <p className="text-xs text-white/55">Sunset</p>
              <p className="text-lg font-semibold">
                {formatSunTime(weather?.daily?.[0]?.sunset ?? sunTimes.sunset)}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tides section */}
      {showTides && (
        <section className="weather-panel overflow-hidden">
          <div className="weather-panel-title">
            <Waves className="h-4 w-4" />
            <h2>Tides</h2>
          </div>
          <TideCanvas predictions={tides.predictions} className="weather-embedded-card" />
        </section>
      )}

      {/* Tide error state */}
      {showTideError && (
        <ErrorState message="Tide data unavailable" onRetry={onRetryTide} variant="weather" />
      )}

      {/* Activity recommendations */}
      {weather && <ActivityRecommendations weather={weather} activities={beach.activities} />}

      {/* 5-Day Forecast */}
      {weather && <WeatherForecastWidget forecast={weather} />}
    </div>
  );
}
