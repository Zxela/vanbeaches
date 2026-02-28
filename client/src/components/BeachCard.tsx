import type { Beach, BeachSummary } from '@van-beaches/shared';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getPersonality } from '../data/beach-personalities';
import { cn } from '../lib/utils';
import { VIBE_ICONS } from '../lib/vibeIcons';
import { getWaterQualityDotColor, getWaterQualityLabel } from '../lib/waterQualityColors';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { FavoriteButton } from './FavoriteButton';

interface BeachCardProps {
  beach: Beach;
  conditions?: BeachSummary;
  isFavorite?: boolean;
}

export function BeachCard({ beach, conditions, isFavorite }: BeachCardProps) {
  const personality = useMemo(() => getPersonality(beach.id), [beach.id]);
  const weather = conditions?.currentWeather;
  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : null;
  const weatherColor = weather ? getWeatherColor(weather.condition) : '';
  const waterQuality = conditions?.waterQuality;
  const vibes = personality?.vibes.slice(0, 2) ?? [];

  return (
    <div
      className={cn('group relative', isFavorite && 'bg-amber-50/50 border-l-2 border-amber-400')}
    >
      <Link
        to={`/beach/${beach.id}`}
        className="flex items-center gap-3 py-3 px-1 hover:bg-sand-50 transition-colors"
      >
        {/* Thumbnail */}
        <div className="w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0">
          {beach.images?.thumb ? (
            <img
              src={beach.images.thumb}
              alt=""
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ocean-400 to-sky-500" />
          )}
        </div>

        {/* Center column: name + tagline + vibe badges */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-sand-900 leading-tight truncate">
            {beach.name}
          </h3>
          {personality && (
            <p className="text-xs text-sand-500 mt-0.5 truncate">{personality.tagline}</p>
          )}
          {vibes.length > 0 && (
            <div className="flex gap-1 mt-1">
              {vibes.map((vibe) => {
                const VibeIcon = VIBE_ICONS[vibe];
                return (
                  <span
                    key={vibe}
                    className="inline-flex items-center rounded-full bg-sand-100 px-1.5 py-0.5"
                    title={vibe}
                  >
                    <VibeIcon className="w-2.5 h-2.5 text-sand-500" strokeWidth={2} />
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Right column: weather + water quality */}
        <div className="flex items-center gap-2 shrink-0 mr-8">
          {weather && (
            <div className="flex items-center gap-1">
              {WeatherIcon && (
                <WeatherIcon className={cn('w-3.5 h-3.5 shrink-0', weatherColor)} strokeWidth={2} />
              )}
              <span className="text-xs font-semibold text-ocean-700">
                {weather.temperature}&deg;C
              </span>
            </div>
          )}
          {waterQuality && waterQuality !== 'unknown' && (
            <span
              className={cn('w-2 h-2 rounded-full shrink-0', getWaterQualityDotColor(waterQuality))}
              title={getWaterQualityLabel(waterQuality)}
              data-testid="water-quality-dot"
            />
          )}
        </div>
      </Link>

      {/* Favorite button — right-aligned */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10">
        <FavoriteButton beachId={beach.id} beachName={beach.name} size="sm" />
      </div>
    </div>
  );
}
