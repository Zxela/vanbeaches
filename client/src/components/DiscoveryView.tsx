import type { Beach, BeachSummary } from '@van-beaches/shared';
import { ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { BeachVibe } from '../data/beach-personalities';
import { getPersonality } from '../data/beach-personalities';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import { VIBE_ICONS } from '../lib/vibeIcons';
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
 * Featured banner with hero image background.
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
      className="relative flex items-end rounded-xl overflow-hidden h-[100px] hover:opacity-95 transition-opacity"
    >
      {/* Background image or gradient */}
      {beach.images?.hero ? (
        <img
          src={beach.images.hero}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-400 to-sky-500" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />

      {/* Content */}
      <div className="relative flex items-end justify-between w-full p-4">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-widest uppercase text-coral-300">
            Today's pick
          </p>
          <p className="font-display text-lg font-bold text-white leading-tight truncate">
            {beach.name}
          </p>
          {personality && <p className="text-xs text-white/70 truncate">{personality.archetype}</p>}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {weather && (
            <div className="flex items-center gap-1.5">
              {WeatherIcon && (
                <WeatherIcon className="w-5 h-5 text-white shrink-0" strokeWidth={2} />
              )}
              <span className="text-base font-semibold text-white">
                {weather.temperature}&deg;C
              </span>
            </div>
          )}
          <ChevronRight className="w-5 h-5 text-white/60 shrink-0" />
        </div>
      </div>
    </Link>
  );
}

export function DiscoveryView({ beaches, beachConditions, loading = false }: DiscoveryViewProps) {
  const [selectedVibe, setSelectedVibe] = useState<BeachVibe | null>(null);
  const { favorites } = useFavorites();

  // Pick the featured beach
  const featuredBeach = pickFeaturedBeach(beaches, beachConditions);

  // Favorites set for highlighting
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  // Filter beaches by selected vibe
  const filteredBeaches = selectedVibe
    ? beaches.filter((beach) => {
        const personality = getPersonality(beach.id);
        return personality?.vibes.includes(selectedVibe) ?? false;
      })
    : beaches;

  // Sort favorites to the top, preserving relative order within each group
  const sortedBeaches = useMemo(() => {
    return [...filteredBeaches].sort((a, b) => {
      const aFav = favSet.has(a.id) ? 0 : 1;
      const bFav = favSet.has(b.id) ? 0 : 1;
      return aFav - bFav;
    });
  }, [filteredBeaches, favSet]);

  const handleVibeClick = (vibe: BeachVibe) => {
    setSelectedVibe((current) => (current === vibe ? null : vibe));
  };

  const clearFilter = () => {
    setSelectedVibe(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 px-4 pb-8">
        {/* Banner skeleton */}
        <div className="rounded-xl bg-sand-200 h-[100px]" />
        {/* Chips skeleton */}
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 w-20 rounded-full bg-sand-200" />
          ))}
        </div>
        {/* Rows skeleton */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 py-3">
            <div className="w-[60px] h-[60px] rounded-lg bg-sand-200 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-sand-200 rounded w-2/3" />
              <div className="h-3 bg-sand-200 rounded w-1/2" />
            </div>
          </div>
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
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-semibold text-sand-900">What's your vibe?</h2>
          {selectedVibe && (
            <button
              type="button"
              onClick={clearFilter}
              className="text-sm text-coral-500 hover:text-coral-600 font-medium"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_VIBES.map(({ vibe, label }) => {
            const isSelected = selectedVibe === vibe;
            const VibeIcon = VIBE_ICONS[vibe];
            return (
              <button
                key={vibe}
                type="button"
                onClick={() => handleVibeClick(vibe)}
                data-selected={String(isSelected)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  isSelected
                    ? 'bg-coral-500 text-white shadow-sm'
                    : 'bg-white text-sand-700 border border-sand-200 hover:border-coral-300 hover:text-coral-600',
                )}
                aria-pressed={isSelected}
              >
                <VibeIcon
                  className={cn('w-3.5 h-3.5', isSelected ? 'text-white' : 'text-sand-500')}
                  strokeWidth={2}
                />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Beach list — compact rows with dividers */}
      <section aria-label="Beach list" data-testid="discovery-beach-list">
        <div className="divide-y divide-sand-100">
          {sortedBeaches.map((beach) => (
            <BeachCard
              key={beach.id}
              beach={beach}
              conditions={beachConditions[beach.id]}
              isFavorite={favSet.has(beach.id)}
            />
          ))}
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
