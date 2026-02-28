import type { Beach, TideData, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getPersonality } from '../data/beach-personalities';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { computeVerdict } from '../utils/verdict';

type BeachConditions = {
  weather: WeatherForecast | null;
  tides: TideData | null;
  waterQuality: WaterQualityStatus | null;
  sunsetTime: string | null;
};

interface FavoritesViewProps {
  favorites: Beach[];
  beachData: Record<string, BeachConditions>;
  loading?: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Skeleton placeholders for loading state
function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4 px-4">
      {/* Greeting skeleton */}
      <div className="h-8 bg-sand-200 rounded-lg w-2/3" />
      <div className="h-4 bg-sand-100 rounded w-1/2" />

      {/* Primary card skeleton */}
      <div className="rounded-2xl overflow-hidden border border-sand-100 shadow-sm">
        <div className="aspect-[16/9] bg-sand-200" />
        <div className="p-4 space-y-3">
          <div className="h-5 bg-sand-200 rounded w-1/2" />
          <div className="h-4 bg-sand-100 rounded w-1/3" />
          <div className="h-4 bg-sand-100 rounded w-2/3" />
          <div className="h-16 bg-sand-100 rounded-xl" />
        </div>
      </div>

      {/* Secondary cards skeleton */}
      <div className="grid grid-cols-2 gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl overflow-hidden border border-sand-100">
            <div className="aspect-[4/3] bg-sand-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-sand-200 rounded w-3/4" />
              <div className="h-3 bg-sand-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Primary beach card (large, full-width)
function PrimaryBeachCard({
  beach,
  conditions,
}: {
  beach: Beach;
  conditions: BeachConditions;
}) {
  const personality = getPersonality(beach.id);
  const { weather, tides, waterQuality, sunsetTime } = conditions;
  const WeatherIcon = weather ? getWeatherIcon(weather.current.condition) : null;
  const weatherColor = weather ? getWeatherColor(weather.current.condition) : '';

  const verdict =
    weather ? computeVerdict(weather, tides, waterQuality, sunsetTime) : null;

  return (
    <motion.div
      className="rounded-2xl overflow-hidden border border-sand-100 shadow-sm bg-white"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link to={`/beach/${beach.id}`} className="block">
        {/* Hero photo */}
        <div className="aspect-[16/9] relative overflow-hidden">
          {beach.images ? (
            <img
              src={beach.images.hero}
              alt={beach.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-ocean-400 to-sky-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          {/* Name overlay */}
          <div className="absolute bottom-0 left-0 p-4">
            <h2 className="font-display text-xl font-bold text-white leading-tight">
              {beach.name}
            </h2>
            {personality && (
              <p className="text-sm text-white/80 mt-0.5">{personality.archetype}</p>
            )}
          </div>
        </div>

        {/* Conditions strip */}
        {weather && (
          <div className="px-4 py-3 flex items-center gap-3 border-b border-sand-100">
            <div className="flex items-center gap-1.5">
              {WeatherIcon && (
                <WeatherIcon className={`w-4 h-4 ${weatherColor}`} strokeWidth={2} />
              )}
              <span className="text-sm font-semibold text-ocean-700">
                {weather.current.temperature}°C
              </span>
              <span className="text-sm text-sand-500 capitalize">
                · {weather.current.condition}
              </span>
            </div>
          </div>
        )}

        {/* Verdict */}
        {verdict && (
          <div className="px-4 py-3">
            <p className="text-sm text-sand-800 leading-relaxed">{verdict.summary}</p>
            <p className="text-xs text-sand-500 mt-1">{verdict.suggestion}</p>
          </div>
        )}
      </Link>
    </motion.div>
  );
}

// Compact beach card (2-column grid)
function CompactBeachCard({
  beach,
  conditions,
}: {
  beach: Beach;
  conditions: BeachConditions;
}) {
  const personality = getPersonality(beach.id);
  const { weather, tides, waterQuality, sunsetTime } = conditions;
  const WeatherIcon = weather ? getWeatherIcon(weather.current.condition) : null;
  const weatherColor = weather ? getWeatherColor(weather.current.condition) : '';

  const verdict =
    weather ? computeVerdict(weather, tides, waterQuality, sunsetTime) : null;

  return (
    <motion.div
      className="rounded-xl overflow-hidden border border-sand-100 shadow-sm bg-white"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link to={`/beach/${beach.id}`} className="block">
        {/* Photo */}
        <div className="aspect-[4/3] relative overflow-hidden">
          {beach.images ? (
            <img
              src={beach.images.thumb}
              alt={beach.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-sky-400 to-ocean-500" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        {/* Info */}
        <div className="p-3">
          <h3 className="font-display text-sm font-semibold text-sand-900 line-clamp-1">
            {beach.name}
          </h3>
          {personality && (
            <p className="text-xs text-coral-600 mt-0.5 line-clamp-1">{personality.archetype}</p>
          )}

          {/* Conditions */}
          {weather && (
            <div className="flex items-center gap-1 mt-1.5">
              {WeatherIcon && (
                <WeatherIcon className={`w-3 h-3 ${weatherColor} shrink-0`} strokeWidth={2} />
              )}
              <span className="text-xs font-semibold text-ocean-700">
                {weather.current.temperature}°C
              </span>
            </div>
          )}

          {/* Short verdict */}
          {verdict && (
            <p className="text-xs text-sand-600 mt-1 line-clamp-2 leading-snug">
              {verdict.summary}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function FavoritesView({ favorites, beachData, loading = false }: FavoritesViewProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  const greeting = getGreeting();
  const primaryBeach = favorites[0] ?? null;
  const otherBeaches = favorites.slice(1);

  return (
    <div className="space-y-6 px-4 pb-8">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl font-bold text-sand-900">{greeting}</h1>
        <p className="text-sm text-sand-600 mt-1 font-sans">
          Here's what's happening at your beaches
        </p>
      </div>

      {/* Primary favorite */}
      {primaryBeach && (
        <section aria-label={`Primary favorite: ${primaryBeach.name}`}>
          <PrimaryBeachCard
            beach={primaryBeach}
            conditions={beachData[primaryBeach.id] ?? {
              weather: null,
              tides: null,
              waterQuality: null,
              sunsetTime: null,
            }}
          />
        </section>
      )}

      {/* Other favorites */}
      {otherBeaches.length > 0 && (
        <section aria-label="Other favorites">
          <div className="grid grid-cols-2 gap-3">
            {otherBeaches.map((beach) => (
              <CompactBeachCard
                key={beach.id}
                beach={beach}
                conditions={beachData[beach.id] ?? {
                  weather: null,
                  tides: null,
                  waterQuality: null,
                  sunsetTime: null,
                }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Explore link */}
      <Link
        to="/discover"
        className="flex items-center gap-2 text-sm font-medium text-ocean-600 hover:text-ocean-700 transition-colors"
      >
        <span className="flex-1 h-px bg-sand-200" />
        <span>Explore all beaches</span>
        <span className="text-sand-400">›</span>
      </Link>
    </div>
  );
}
