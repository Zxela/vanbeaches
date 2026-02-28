import type { Beach, BeachSummary } from '@van-beaches/shared';
import { BEACHES } from '@van-beaches/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BeachVibe } from '../data/beach-personalities';
import { getPersonality } from '../data/beach-personalities';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';
import { BeachCard } from './BeachCard';
import { BeachMap } from './BeachMap';

// All possible beach vibes
const ALL_VIBES: { vibe: BeachVibe; label: string }[] = [
  { vibe: 'active', label: 'Active' },
  { vibe: 'quiet', label: 'Quiet' },
  { vibe: 'family', label: 'Family' },
  { vibe: 'dog-friendly', label: 'Dog-friendly' },
  { vibe: 'sunset', label: 'Sunset' },
  { vibe: 'social', label: 'Social' },
  { vibe: 'nature', label: 'Nature' },
  { vibe: 'urban', label: 'Urban' },
];

interface DiscoveryViewProps {
  beaches: Beach[];
  beachConditions: Record<string, BeachSummary>;
  loading?: boolean;
}

/**
 * Pick the best featured beach based on conditions.
 * Prefers beaches with highest temperature (sunny days first),
 * falls back to the first beach if no conditions are available.
 */
function pickFeaturedBeach(
  beaches: Beach[],
  beachConditions: Record<string, BeachSummary>,
): Beach | null {
  if (beaches.length === 0) return null;

  let bestBeach = beaches[0];
  let bestTemp = -Infinity;

  for (const beach of beaches) {
    const conditions = beachConditions[beach.id];
    if (conditions?.currentWeather) {
      const temp = conditions.currentWeather.temperature;
      if (temp > bestTemp) {
        bestTemp = temp;
        bestBeach = beach;
      }
    }
  }

  return bestBeach;
}

/**
 * Editorial hero section (~35vh) featuring the recommended beach of the day.
 */
function EditorialHero({
  beach,
  conditions,
}: {
  beach: Beach;
  conditions: BeachSummary | undefined;
}) {
  const personality = getPersonality(beach.id);
  const beachData = BEACHES.find((b) => b.id === beach.id);
  const weather = conditions?.currentWeather;
  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : null;
  const weatherColor = weather ? getWeatherColor(weather.condition) : '';

  return (
    <div
      data-testid="discovery-hero"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-400 to-sky-500"
      style={{ minHeight: '35vh' }}
    >
      {/* Beach photo background */}
      {beachData?.images ? (
        <img
          src={beachData.images.hero}
          alt={beach.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}

      {/* Warm overlay — lighter than original design to let photo breathe */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-end h-full p-5 pt-12">
        {/* Today's pick label */}
        <p className="text-xs font-semibold tracking-widest uppercase text-white/80 mb-1">
          Today's pick
        </p>

        {/* Beach name */}
        <h2 className="font-display text-2xl font-bold text-white leading-tight">
          {beach.name}
        </h2>

        {/* Personality archetype */}
        {personality && (
          <p className="text-sm text-white/80 mt-0.5">{personality.archetype}</p>
        )}

        {/* Condition summary */}
        {weather && (
          <div className="flex items-center gap-2 mt-3">
            {WeatherIcon && (
              <WeatherIcon className={`w-4 h-4 text-white shrink-0`} strokeWidth={2} />
            )}
            <span className="text-sm font-semibold text-white">
              {weather.temperature}°C
            </span>
            <span className="text-sm text-white/80 capitalize">
              · {weather.condition}
            </span>
          </div>
        )}

        {/* CTA link */}
        <Link
          to={`/beach/${beach.id}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-sand-100 transition-colors"
        >
          Check it out
          <span className="ml-0.5">→</span>
        </Link>
      </div>
    </div>
  );
}

export function DiscoveryView({
  beaches,
  beachConditions,
  loading = false,
}: DiscoveryViewProps) {
  const [selectedVibe, setSelectedVibe] = useState<BeachVibe | null>(null);

  // Pick the featured beach
  const featuredBeach = pickFeaturedBeach(beaches, beachConditions);

  // Filter beaches by selected vibe
  const filteredBeaches = selectedVibe
    ? beaches.filter((beach) => {
        const personality = getPersonality(beach.id);
        return personality?.vibes.includes(selectedVibe) ?? false;
      })
    : beaches;

  // Build BeachSummary records for BeachCard
  const beachSummaries = filteredBeaches.map((beach): [string, BeachSummary | undefined] => [
    beach.id,
    beachConditions[beach.id],
  ]);

  const handleVibeClick = (vibe: BeachVibe) => {
    setSelectedVibe((current) => (current === vibe ? null : vibe));
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 px-4 pb-8">
        {/* Hero skeleton */}
        <div className="rounded-2xl bg-sand-200" style={{ minHeight: '35vh' }} />
        {/* Chips skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-sand-200" />
          ))}
        </div>
        {/* Cards skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-sand-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-8">
      {/* Editorial hero */}
      {featuredBeach && (
        <section aria-label="Today's featured beach">
          <EditorialHero
            beach={featuredBeach}
            conditions={beachConditions[featuredBeach.id]}
          />
        </section>
      )}

      {/* Vibe filter chips */}
      <section aria-label="Filter by vibe">
        <h2 className="font-display text-lg font-semibold text-sand-900 mb-3">
          What's your vibe?
        </h2>
        <div className="flex flex-wrap gap-2">
          {ALL_VIBES.map(({ vibe, label }) => {
            const isSelected = selectedVibe === vibe;
            return (
              <button
                key={vibe}
                type="button"
                onClick={() => handleVibeClick(vibe)}
                data-selected={String(isSelected)}
                className={[
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'bg-white text-sand-700 border border-sand-200 hover:border-coral-300 hover:text-coral-600',
                ].join(' ')}
                aria-pressed={isSelected}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Beach list — personality-forward cards */}
      <section aria-label="Beach list" data-testid="discovery-beach-list">
        <div className="space-y-3">
          {beachSummaries.map(([beachId, summary]) => {
            const beach = beaches.find((b) => b.id === beachId);
            if (!beach) return null;

            // Build a BeachSummary for BeachCard (which expects BeachSummary type)
            const beachSummaryForCard: BeachSummary = summary ?? {
              id: beach.id,
              name: beach.name,
              currentWeather: null,
              nextTide: null,
              waterQuality: 'unknown',
              lastUpdated: new Date().toISOString(),
            };

            return (
              <BeachCard key={beachId} beach={beachSummaryForCard} />
            );
          })}
        </div>
      </section>

      {/* Compact map section */}
      <section aria-label="Beach map" data-testid="discovery-map">
        <h2 className="font-display text-lg font-semibold text-sand-900 mb-3">
          View on map
        </h2>
        <BeachMap />
      </section>
    </div>
  );
}
