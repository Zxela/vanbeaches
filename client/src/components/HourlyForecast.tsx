import type { WeatherForecast } from '@van-beaches/shared';
import { ChartNoAxesCombined, ChevronDown, Clock3, Droplets } from 'lucide-react';
import { useState } from 'react';
import { getWeatherIcon } from '../lib/weatherIcons';

interface HourlyForecastProps {
  forecast: WeatherForecast;
}

export function HourlyForecast({ forecast }: HourlyForecastProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [metric, setMetric] = useState<'temperature' | 'precipitation' | 'wind' | 'uv'>(
    'temperature',
  );
  const now = Date.now();
  const hours = forecast.hourly.filter((hour) => new Date(hour.time).getTime() >= now - 3600000);
  const visibleHours = (hours.length ? hours : forecast.hourly).slice(0, 24);

  if (visibleHours.length === 0) return null;

  return (
    <section className="weather-panel overflow-hidden" aria-labelledby="hourly-heading">
      <div className="weather-panel-title">
        <Clock3 className="h-4 w-4" />
        <h2 id="hourly-heading">Hourly Forecast</h2>
      </div>
      <div className="flex snap-x snap-mandatory gap-1 overflow-x-auto px-3 pb-4 scrollbar-hide">
        {visibleHours.map((hour, index) => {
          const Icon = getWeatherIcon(hour.condition);
          const date = new Date(hour.time);
          return (
            <div
              key={hour.time}
              className="flex w-[4.5rem] shrink-0 snap-start flex-col items-center gap-2 rounded-2xl px-2 py-3 text-white"
            >
              <span className="text-sm font-semibold">
                {index === 0 ? 'Now' : date.toLocaleTimeString('en-CA', { hour: 'numeric' })}
              </span>
              <div className="flex h-5 items-center gap-0.5 text-xs text-sky-100">
                {hour.precipitationProbability > 0 && <Droplets className="h-3 w-3" />}
                {hour.precipitationProbability > 0 ? `${hour.precipitationProbability}%` : ''}
              </div>
              <Icon className="h-7 w-7 text-white drop-shadow" strokeWidth={1.6} />
              <span className="text-lg font-semibold tabular-nums">
                {Math.round(hour.temperature)}°
              </span>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/15">
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-white/75 hover:bg-white/5 hover:text-white"
          aria-expanded={showDetails}
          aria-controls="hourly-details"
          onClick={() => setShowDetails((open) => !open)}
        >
          <span className="flex items-center gap-2">
            <ChartNoAxesCombined className="h-4 w-4" />
            Forecast details
          </span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
        </button>
        {showDetails && (
          <div id="hourly-details" className="border-t border-white/15 p-4">
            <div
              className="mb-4 flex gap-1 overflow-x-auto"
              role="tablist"
              aria-label="Hourly forecast metric"
            >
              {(['temperature', 'precipitation', 'wind', 'uv'] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  role="tab"
                  aria-selected={metric === item}
                  onClick={() => setMetric(item)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${metric === item ? 'bg-white text-slate-700' : 'bg-white/10 text-white/65 hover:bg-white/15'}`}
                >
                  {item}
                </button>
              ))}
            </div>
            <HourlyBars hours={visibleHours.slice(0, 12)} metric={metric} />
          </div>
        )}
      </div>
    </section>
  );
}

function HourlyBars({
  hours,
  metric,
}: { hours: WeatherForecast['hourly']; metric: 'temperature' | 'precipitation' | 'wind' | 'uv' }) {
  const values = hours.map((hour) => {
    if (metric === 'precipitation') return hour.precipitationProbability;
    if (metric === 'wind') return hour.windSpeed ?? 0;
    if (metric === 'uv') return hour.uvIndex ?? 0;
    return hour.temperature;
  });
  const min = metric === 'temperature' ? Math.min(...values) - 2 : 0;
  const max = Math.max(...values, min + 1);
  const unit =
    metric === 'temperature'
      ? '°'
      : metric === 'precipitation'
        ? '%'
        : metric === 'wind'
          ? ' km/h'
          : '';

  return (
    <div role="tabpanel" aria-label={`Hourly ${metric}`} className="flex h-40 items-end gap-1.5">
      {hours.map((hour, index) => {
        const height = 18 + ((values[index] - min) / (max - min)) * 74;
        return (
          <div
            key={hour.time}
            className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-[10px] font-medium text-white/75">
              {Math.round(values[index])}
              {unit}
            </span>
            <span
              className="w-full rounded-t bg-gradient-to-t from-white/25 to-white/75"
              style={{ height: `${height}%` }}
            />
            <span className="text-[9px] text-white/45">
              {new Date(hour.time).toLocaleTimeString('en-CA', { hour: 'numeric' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
