import type { Beach, TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';
import { getWaterQualityBgColor, getWaterQualityTextLabel } from '../lib/waterQualityColors';
import { ActivityRecommendations } from './ActivityRecommendations';
import { BeachVerdict } from './BeachVerdict';
import { ErrorState } from './ErrorState';
import { SunTimesWidget } from './SunTimesWidget';
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
}: TodayTabProps) {
  const showTides = beach.tideStationId !== null && tides !== null;
  const showTideError = beach.tideStationId !== null && tideError && !tides;
  const sunTimes = useSunTimes(beach.location.latitude, beach.location.longitude);

  return (
    <div className="space-y-6 px-4 pb-8">
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
        <ErrorState message="Couldn't load conditions" onRetry={onRetryWeather} />
      )}

      {/* Compact conditions grid */}
      {weather && (
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-sand-800">Conditions</h2>
            <span className="text-xs text-sand-400">
              Updated {getUpdatedMinutesAgo(weather.fetchedAt)} min ago
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* Temperature */}
            <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 text-center">
              <p className="text-xl font-bold text-sand-900">{weather.current.temperature}°</p>
              <p className="text-xs text-sand-500 capitalize mt-0.5">
                {weather.current.condition.replace('-', ' ')}
              </p>
            </div>

            {/* Wind */}
            <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 text-center">
              <p className="text-xl font-bold text-sand-900">{weather.current.windSpeed} km/h</p>
              <p className="text-xs text-sand-500 mt-0.5">{weather.current.windDirection} wind</p>
            </div>

            {/* UV Index */}
            <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 text-center">
              <p className="text-xl font-bold text-sand-900">UV {weather.current.uvIndex}</p>
              <p className="text-xs text-sand-500 mt-0.5">{getUvLabel(weather.current.uvIndex)}</p>
            </div>

            {/* Water Quality */}
            {waterQuality && (
              <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 text-center">
                <p className="text-sm font-semibold text-sand-900">Water</p>
                <span
                  data-testid="water-quality-label"
                  className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getWaterQualityBgColor(waterQuality.level)}`}
                >
                  {getWaterQualityTextLabel(waterQuality.level)}
                </span>
              </div>
            )}

            {/* Sunrise/Sunset summary */}
            <div className="rounded-xl bg-sand-50 border border-sand-200 p-3 text-center">
              <p className="text-sm font-semibold text-sand-900">Sunrise</p>
              <p className="text-xs text-sand-500 mt-0.5">{formatSunTime(sunTimes.sunrise)}</p>
            </div>
          </div>
        </section>
      )}

      {/* Sun Times Widget */}
      <SunTimesWidget latitude={beach.location.latitude} longitude={beach.location.longitude} />

      {/* Tides section */}
      {showTides && (
        <section>
          <h2 className="font-display text-lg font-semibold text-sand-800 mb-3">Tides</h2>
          <TideCanvas predictions={tides.predictions} />
        </section>
      )}

      {/* Tide error state */}
      {showTideError && (
        <ErrorState message="Tide data unavailable" onRetry={onRetryTide} />
      )}

      {/* Activity recommendations */}
      {weather && <ActivityRecommendations weather={weather} activities={beach.activities} />}

      {/* 5-Day Forecast */}
      {weather && <WeatherForecastWidget forecast={weather} />}
    </div>
  );
}
