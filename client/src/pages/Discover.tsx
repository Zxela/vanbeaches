import type { BeachSummary } from '@van-beaches/shared';
import { BEACHES } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { CheckCircle, MapPin, Sparkles, Thermometer } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BeachCard } from '../components/BeachCard';
import { BeachGuidePromo } from '../components/BeachGuidePromo';
import { BeachMap } from '../components/BeachMap';
import { NewsletterSignup } from '../components/NewsletterSignup';
import { SearchFilter } from '../components/SearchFilter';
import { Icon } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useBeaches } from '../hooks/useBeaches';
import { useFavorites } from '../hooks/useFavorites';
import { getBeachGreeting } from '../lib/utils';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';

// Hero image - use English Bay as the signature hero shot
const HERO_IMAGE = 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1600&q=80';

function HeroSection({ beaches }: { beaches: BeachSummary[] }) {
  const { greeting, suggestion } = getBeachGreeting();

  const bestTemp = useMemo(() => {
    if (!beaches.length) return null;
    const withWeather = beaches.filter((b) => b.currentWeather);
    if (!withWeather.length) return null;
    return withWeather.reduce((best, b) =>
      (b.currentWeather?.temperature ?? 0) > (best.currentWeather?.temperature ?? 0) ? b : best,
    );
  }, [beaches]);

  const goodWaterCount = useMemo(
    () => beaches.filter((b) => b.waterQuality === 'good').length,
    [beaches],
  );

  return (
    <div className="relative w-full h-[50vh] min-h-[360px] max-h-[560px] overflow-hidden">
      {/* Background image */}
      <img
        src={HERO_IMAGE}
        alt="Vancouver beach coastline"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Atmospheric gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-sand-50 dark:to-sand-900" />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col justify-end">
        <div className="container mx-auto max-w-7xl px-4 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-white/80 text-sm font-medium mb-1">{suggestion}</p>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {greeting}, explorer
            </h1>
          </motion.div>

          {/* Stats pills */}
          {(bestTemp?.currentWeather || goodWaterCount > 0) && (
            <motion.div
              className="flex flex-wrap gap-3 mt-5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {bestTemp?.currentWeather && (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20">
                  <Icon icon={Thermometer} size="sm" className="text-white/80" />
                  <span className="text-sm text-white">
                    <span className="font-semibold">{bestTemp.currentWeather.temperature}°C</span>
                    <span className="text-white/70 ml-1.5">warmest at {bestTemp.name}</span>
                  </span>
                </div>
              )}
              {goodWaterCount > 0 && (
                <div className="flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-xl px-4 py-2.5 border border-white/20">
                  <Icon icon={CheckCircle} size="sm" className="text-emerald-300" />
                  <span className="text-sm text-white">
                    <span className="font-semibold">{goodWaterCount} beaches</span>
                    <span className="text-white/70 ml-1.5">with good water quality</span>
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Category labels for recommended beaches
const RECOMMENDATION_LABELS = ['Best right now', 'Best for sunset', 'Adventure pick'];

interface RecommendedBeach {
  id: string;
  name: string;
  score: number;
  reason: string;
  label: string;
  weather: BeachSummary['currentWeather'];
  waterQuality: BeachSummary['waterQuality'];
}

function RecommendedSection({
  beaches,
  loading,
}: {
  beaches: RecommendedBeach[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <section>
        <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-2">
          Today's top picks
        </h2>
        <p className="text-sand-500 dark:text-sand-400 mb-6 text-sm">
          Based on current weather, tides, and water quality
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={`rec-skeleton-${i}`} showHeader contentLines={2} />
          ))}
        </div>
      </section>
    );
  }

  if (beaches.length === 0) return null;

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
      <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-2 flex items-center gap-2">
        <Icon icon={Sparkles} size="lg" color="warning" />
        Today's top picks
      </h2>
      <p className="text-sand-500 dark:text-sand-400 mb-6 text-sm">
        Based on current weather, tides, and water quality
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {beaches.map((beach, idx) => {
          const beachData = BEACHES.find((b) => b.id === beach.id);
          const WeatherIcon = beach.weather ? getWeatherIcon(beach.weather.condition) : null;
          const weatherColor = beach.weather ? getWeatherColor(beach.weather.condition) : '';
          const gradientIdx = beach.name.length % 4;
          const fallbackGradients = [
            'from-ocean-400 to-sky-500',
            'from-shore-400 to-ocean-500',
            'from-sky-400 to-ocean-600',
            'from-ocean-500 to-shore-400',
          ];

          return (
            <motion.div
              key={beach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
            >
              <Link to={`/beach/${beach.id}`} className="block group">
                <div className="relative aspect-[3/2] overflow-hidden rounded-2xl">
                  {beachData?.images ? (
                    <img
                      src={beachData.images.thumb}
                      alt={beach.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${fallbackGradients[gradientIdx]}`}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

                  {/* Category pill */}
                  <div className="absolute top-3 left-3">
                    <span className="bg-white/20 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/20">
                      {beach.label}
                    </span>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className="font-bold text-white text-lg">{beach.name}</h3>
                    <p className="text-sm text-white/80 mt-0.5">{beach.reason}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {beach.weather && (
                        <div className="flex items-center gap-1.5">
                          {WeatherIcon && (
                            <WeatherIcon className={`w-4 h-4 ${weatherColor}`} strokeWidth={1.5} />
                          )}
                          <span className="text-sm font-semibold text-white">
                            {beach.weather.temperature}°C
                          </span>
                        </div>
                      )}
                      {beach.waterQuality === 'good' && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          Clean water
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

function AllBeachesSection({
  loading,
  beaches,
  filteredIds,
}: {
  loading: boolean;
  beaches: BeachSummary[];
  filteredIds: string[] | null;
}) {
  const { favorites } = useFavorites();

  const sortedBeaches = useMemo(() => {
    const visibleBeaches =
      filteredIds !== null ? beaches.filter((b) => filteredIds.includes(b.id)) : beaches;
    return [...visibleBeaches].sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [favorites, beaches, filteredIds]);

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
      <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6 flex items-center gap-2">
        <Icon icon={MapPin} size="lg" color="ocean" />
        All Beaches
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={`beach-skeleton-${i}`} showHeader contentLines={2} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sortedBeaches.map((beach) => (
            <BeachCard key={beach.id} beach={beach} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

export function Discover() {
  const { beaches, loading } = useBeaches();
  const [filteredBeachIds, setFilteredBeachIds] = useState<string[] | null>(null);

  const handleFilter = useCallback((ids: string[]) => {
    setFilteredBeachIds(ids.length === BEACHES.length ? null : ids);
  }, []);

  const recommendedBeaches = useMemo((): RecommendedBeach[] => {
    if (!beaches.length) return [];

    return beaches
      .map((beach) => {
        let score = 50;
        const reasons: string[] = [];

        if (beach.currentWeather) {
          if (beach.currentWeather.condition === 'sunny') {
            score += 25;
            reasons.push('Sunny skies');
          } else if (beach.currentWeather.condition === 'partly-cloudy') {
            score += 15;
            reasons.push('Nice weather');
          }

          if (beach.currentWeather.temperature >= 18) {
            score += 15;
            reasons.push('Warm');
          } else if (beach.currentWeather.temperature >= 14) {
            score += 10;
            reasons.push('Pleasant temp');
          }
        }

        if (beach.waterQuality === 'good') {
          score += 20;
          reasons.push('Clean water');
        }

        return {
          id: beach.id,
          name: beach.name,
          score: Math.min(100, score),
          reason: reasons.slice(0, 2).join(' \u2022 ') || 'Great beach',
          label: '',
          weather: beach.currentWeather,
          waterQuality: beach.waterQuality,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((beach, idx) => ({
        ...beach,
        label: RECOMMENDATION_LABELS[idx] || 'Top pick',
      }));
  }, [beaches]);

  return (
    <div>
      {/* Full-bleed hero */}
      <HeroSection beaches={beaches} />

      {/* Contained content sections */}
      <div className="container mx-auto max-w-7xl px-4 space-y-10 py-8">
        <SearchFilter onFilter={handleFilter} />
        <RecommendedSection beaches={recommendedBeaches} loading={loading} />
        <AllBeachesSection loading={loading} beaches={beaches} filteredIds={filteredBeachIds} />

        {/* Beach guide promo */}
        <BeachGuidePromo />

        {/* Map section */}
        <section>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6 flex items-center gap-2">
            <Icon icon={MapPin} size="lg" color="ocean" />
            Explore the coastline
          </h2>
          <BeachMap />
        </section>

        {/* Newsletter signup */}
        <NewsletterSignup />
      </div>
    </div>
  );
}
