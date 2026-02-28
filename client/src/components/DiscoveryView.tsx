import type { Beach, BeachSummary } from '@van-beaches/shared';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { BeachVibe } from '../data/beach-personalities';
import { getPersonality } from '../data/beach-personalities';
import { getWeatherIcon } from '../lib/weatherIcons';
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
  let bestTemp = Number.NEGATIVE_INFINITY;

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
 * Compact banner (~60px) featuring the recommended beach of the day.
 */
function FeaturedBanner({
  beach,
  conditions,
}: {
  beach: Beach;
  conditions: BeachSummary | undefined;
}) {
  const personality = getPersonality(beach.id);
  const weather = conditions?.currentWeather;
  const WeatherIcon = weather ? getWeatherIcon(weather.condition) : null;

  return (
    <Link
      to={`/beach/${beach.id}`}
      data-testid="discovery-hero"
      className="flex items-center gap-3 rounded-xl bg-sand-50 px-4 py-3 hover:bg-sand-100 transition-colors"
    >
      {/* Label + beach info */}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-coral-500">
          Today's pick
        </p>
        <p className="font-display text-sm font-bold text-sand-900 leading-tight truncate">
          {beach.name}
          {personality && (
            <span className="font-normal text-sand-500 ml-1.5">— {personality.archetype}</span>
          )}
        </p>
      </div>

      {/* Conditions */}
      {weather && (
        <div className="flex items-center gap-1.5 shrink-0">
          {WeatherIcon && (
            <WeatherIcon className="w-4 h-4 text-ocean-500 shrink-0" strokeWidth={2} />
          )}
          <span className="text-sm font-semibold text-ocean-700">{weather.temperature}°C</span>
        </div>
      )}

      {/* Arrow */}
      <span className="text-sand-400 shrink-0">→</span>
    </Link>
  );
}

export function DiscoveryView({ beaches, beachConditions, loading = false }: DiscoveryViewProps) {
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
        {/* Banner skeleton */}
        <div className="rounded-xl bg-sand-200 h-14" />
        {/* Chips skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-sand-200" />
          ))}
        </div>
        {/* Rows skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 bg-sand-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-8">
      {/* Featured banner */}
      {featuredBeach && (
        <section aria-label="Today's featured beach">
          <FeaturedBanner beach={featuredBeach} conditions={beachConditions[featuredBeach.id]} />
        </section>
      )}

      {/* Vibe filter chips */}
      <section aria-label="Filter by vibe">
        <h2 className="font-display text-lg font-semibold text-sand-900 mb-3">What's your vibe?</h2>
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

      {/* Beach list — compact rows with dividers */}
      <section aria-label="Beach list" data-testid="discovery-beach-list">
        <div className="divide-y divide-sand-100">
          {beachSummaries.map(([beachId, summary]) => {
            const beach = beaches.find((b) => b.id === beachId);
            if (!beach) return null;

            const beachSummaryForCard: BeachSummary = summary ?? {
              id: beach.id,
              name: beach.name,
              currentWeather: null,
              nextTide: null,
              waterQuality: 'unknown',
              lastUpdated: new Date().toISOString(),
            };

            return <BeachCard key={beachId} beach={beachSummaryForCard} />;
          })}
        </div>
      </section>

      {/* Compact map section */}
      <section aria-label="Beach map" data-testid="discovery-map">
        <h2 className="font-display text-lg font-semibold text-sand-900 mb-3">View on map</h2>
        <BeachMap />
      </section>
    </div>
  );
}
