import type { BeachSummary } from '@van-beaches/shared';
import { BEACHES } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Calendar,
  CheckCircle,
  Cloud,
  MapPin,
  Sparkles,
  Thermometer,
  TrendingUp,
  Waves,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BeachCard } from '../components/BeachCard';
import { BeachMap } from '../components/BeachMap';
import { SearchFilter } from '../components/SearchFilter';
import { Card, CardContent, Icon } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useBeaches } from '../hooks/useBeaches';
import { useFavorites } from '../hooks/useFavorites';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';

function HeroSection({ beaches }: { beaches: BeachSummary[] }) {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

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
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ocean-600 via-ocean-500 to-sky-400 dark:from-ocean-800 dark:via-ocean-700 dark:to-sky-700 p-8 md:p-10 text-white"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated wave decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-4 left-0 right-0 h-24 opacity-[0.08]">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path
              d="M0,40 C150,90 350,0 500,50 C650,100 800,10 1000,60 C1100,80 1150,40 1200,50 L1200,120 L0,120 Z"
              fill="currentColor"
            />
          </svg>
        </div>
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-white/[0.06]" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.04]" />
      </div>

      <div className="relative z-10">
        <motion.div
          className="flex items-center gap-3 mb-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <Icon icon={Waves} size="xl" className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Vancouver Beaches
            </h1>
            <div className="flex items-center gap-3 text-white/70 text-sm mt-0.5">
              <span className="flex items-center gap-1">
                <Icon icon={Calendar} size="xs" />
                {dayName}, {dateStr}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon={MapPin} size="xs" />
                Vancouver, BC
              </span>
            </div>
          </div>
        </motion.div>

        {/* Live conditions strip */}
        {(bestTemp?.currentWeather || goodWaterCount > 0) && (
          <motion.div
            className="flex flex-wrap gap-3 mt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            {bestTemp?.currentWeather && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                <Icon icon={Thermometer} size="sm" className="text-white/80" />
                <span className="text-sm">
                  <span className="font-semibold">{bestTemp.currentWeather.temperature}°C</span>
                  <span className="text-white/70 ml-1.5">warmest at {bestTemp.name}</span>
                </span>
              </div>
            )}
            {goodWaterCount > 0 && (
              <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-4 py-2.5">
                <Icon icon={CheckCircle} size="sm" className="text-emerald-300" />
                <span className="text-sm">
                  <span className="font-semibold">{goodWaterCount} beaches</span>
                  <span className="text-white/70 ml-1.5">with good water quality</span>
                </span>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

interface RecommendedBeach {
  id: string;
  name: string;
  score: number;
  reason: string;
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
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-sand-900 dark:text-sand-100 mb-4 flex items-center gap-2">
          <Icon icon={Sparkles} size="lg" color="warning" />
          Recommended For You
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <SkeletonCard key={`rec-skeleton-${i}`} showHeader contentLines={2} />
          ))}
        </div>
      </section>
    );
  }

  if (beaches.length === 0) return null;

  const waterQualityBadge = (level: string) => {
    if (level === 'good')
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Safe
        </span>
      );
    if (level === 'advisory')
      return (
        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Advisory
        </span>
      );
    return null;
  };

  return (
    <motion.section
      className="mt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <h2 className="text-xl font-semibold text-sand-900 dark:text-sand-100 mb-4 flex items-center gap-2">
        <Icon icon={Sparkles} size="lg" color="warning" />
        Recommended For You
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {beaches.map((beach, idx) => {
          const WeatherIcon = beach.weather
            ? getWeatherIcon(beach.weather.condition)
            : null;
          const weatherColor = beach.weather
            ? getWeatherColor(beach.weather.condition)
            : '';

          return (
            <motion.div
              key={beach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.05 }}
            >
              <Link to={`/beach/${beach.id}`} className="block group">
                <Card variant="interactive" className="h-full relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-sand-900 dark:text-sand-100 group-hover:text-ocean-600 dark:group-hover:text-ocean-400 transition-colors">
                          {beach.name}
                        </h3>
                        <p className="text-sm text-sand-500 dark:text-sand-400 flex items-center gap-1 mt-0.5">
                          <Icon icon={Cloud} size="xs" color="muted" />
                          {beach.reason}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-medium">
                        <Icon icon={TrendingUp} size="xs" />
                        {beach.score}%
                      </span>
                    </div>

                    {/* Inline conditions */}
                    <div className="flex items-center gap-3 pt-3 border-t border-sand-100 dark:border-sand-700/50">
                      {beach.weather && (
                        <div className="flex items-center gap-2">
                          {WeatherIcon && (
                            <WeatherIcon className={`w-5 h-5 ${weatherColor}`} strokeWidth={1.5} />
                          )}
                          <span className="text-sm font-semibold text-sand-900 dark:text-sand-100">
                            {beach.weather.temperature}°C
                          </span>
                        </div>
                      )}
                      {waterQualityBadge(beach.waterQuality)}
                      <div className="ml-auto flex items-center gap-1 text-xs text-ocean-600 dark:text-ocean-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>View</span>
                        <Icon icon={ArrowRight} size="xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
    <motion.section
      className="mt-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.7 }}
    >
      <h2 className="text-xl font-semibold text-sand-900 dark:text-sand-100 mb-4 flex items-center gap-2">
        <Icon icon={MapPin} size="lg" color="ocean" />
        All Beaches
      </h2>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonCard key={`beach-skeleton-${i}`} showHeader contentLines={2} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedBeaches.map((beach, idx) => (
            <motion.div
              key={beach.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + idx * 0.02 }}
            >
              <BeachCard beach={beach} />
            </motion.div>
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
          weather: beach.currentWeather,
          waterQuality: beach.waterQuality,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [beaches]);

  return (
    <div className="space-y-2">
      <HeroSection beaches={beaches} />
      <div className="mt-4">
        <SearchFilter onFilter={handleFilter} />
      </div>
      <RecommendedSection beaches={recommendedBeaches} loading={loading} />
      <AllBeachesSection loading={loading} beaches={beaches} filteredIds={filteredBeachIds} />
      <section className="mt-8">
        <BeachMap />
      </section>
    </div>
  );
}
