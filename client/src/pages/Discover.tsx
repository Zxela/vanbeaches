import { BEACHES } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { Calendar, Cloud, MapPin, Sparkles, Sun, TrendingUp, Waves } from 'lucide-react';
import { useMemo } from 'react';
import { BeachCard } from '../components/BeachCard';
import { Card, CardContent, Icon } from '../components/ui';
import { SkeletonCard } from '../components/ui/Skeleton';
import { useBeaches } from '../hooks/useBeaches';
import { useFavorites } from '../hooks/useFavorites';

function HeroSection() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-ocean-500 via-ocean-600 to-shore-600 p-6 md:p-8 text-white shadow-2xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/20" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-white/10" />
      </div>

      <div className="relative z-10">
        <motion.div
          className="flex items-center gap-2 mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Icon icon={Waves} size="xl" className="text-white/90" />
          <h1 className="text-2xl md:text-3xl font-bold">Find Your Perfect Beach Today</h1>
        </motion.div>

        <motion.div
          className="flex flex-wrap items-center gap-4 text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <span className="flex items-center gap-1.5">
            <Icon icon={Calendar} size="sm" />
            {dayName}, {dateStr}
          </span>
          <span className="flex items-center gap-1.5">
            <Icon icon={Sun} size="sm" />
            Vancouver, BC
          </span>
        </motion.div>

        <motion.p
          className="mt-4 text-white/70 max-w-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Explore Vancouver's beaches and find the perfect spot based on current conditions.
          Favorite a beach to make it your homepage.
        </motion.p>
      </div>
    </motion.div>
  );
}

function RecommendedSection({
  beaches,
  loading,
}: {
  beaches: { id: string; name: string; score: number; reason: string }[];
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
        {beaches.map((beach, idx) => (
          <motion.div
            key={beach.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + idx * 0.1 }}
          >
            <Card variant="ocean" className="h-full">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-sand-900 dark:text-sand-100">{beach.name}</h3>
                  <span className="flex items-center gap-1 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                    <Icon icon={TrendingUp} size="xs" />
                    {beach.score}%
                  </span>
                </div>
                <p className="text-sm text-sand-600 dark:text-sand-400 flex items-center gap-1">
                  <Icon icon={Cloud} size="xs" color="muted" />
                  {beach.reason}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

function AllBeachesSection({ loading }: { loading: boolean }) {
  const { favorites } = useFavorites();

  // Sort beaches: favorites first, then alphabetically
  const sortedBeaches = useMemo(() => {
    return [...BEACHES].sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [favorites]);

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
              transition={{ delay: 0.8 + idx * 0.05 }}
            >
              <BeachCard
                beach={{
                  id: beach.id,
                  name: beach.name,
                  currentWeather: null,
                  nextTide: null,
                  waterQuality: 'unknown',
                  lastUpdated: new Date().toISOString(),
                }}
              />
            </motion.div>
          ))}
        </div>
      )}
    </motion.section>
  );
}

export function Discover() {
  const { beaches, loading } = useBeaches();

  // Simple ranking algorithm based on current conditions
  const recommendedBeaches = useMemo(() => {
    if (!beaches.length) return [];

    return beaches
      .map((beach) => {
        let score = 50;
        const reasons: string[] = [];

        // Weather scoring
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

        // Water quality scoring
        if (beach.waterQuality === 'good') {
          score += 20;
          reasons.push('Clean water');
        }

        return {
          id: beach.id,
          name: beach.name,
          score: Math.min(100, score),
          reason: reasons.slice(0, 2).join(' • ') || 'Great beach',
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [beaches]);

  return (
    <div className="space-y-2">
      <HeroSection />
      <RecommendedSection beaches={recommendedBeaches} loading={loading} />
      <AllBeachesSection loading={loading} />

      {/* Future: Sponsored content zone (hidden for now) */}
      {/* <ContentSlot id="sponsored-nearby" hidden /> */}
    </div>
  );
}
