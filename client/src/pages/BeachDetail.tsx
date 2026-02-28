import { getBeachById } from '@van-beaches/shared';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AboutTab } from '../components/AboutTab';
import { FavoriteButton } from '../components/FavoriteButton';
import { PhotosTab } from '../components/PhotosTab';
import { ShareButton } from '../components/ShareButton';
import { type BeachDetailTab, TabBar } from '../components/TabBar';
import { TodayTab } from '../components/TodayTab';
import { useRecentBeaches } from '../hooks/useRecentBeaches';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';
import { useTides } from '../hooks/useTides';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { useWeather } from '../hooks/useWeather';

// Fallback gradients when no image is available
const fallbackGradients = [
  'from-ocean-400 to-sky-500',
  'from-shore-400 to-ocean-500',
  'from-sky-400 to-ocean-600',
  'from-ocean-500 to-shore-400',
];

function getInitialTab(): BeachDetailTab {
  const hash = window.location.hash.replace('#', '');
  if (hash === 'about' || hash === 'photos' || hash === 'today') {
    return hash as BeachDetailTab;
  }
  return 'today';
}

function HeroQuickConditions({
  temperature,
  condition,
  windSpeed,
}: {
  temperature: number | null;
  condition: string | null;
  windSpeed: number | null;
}) {
  const parts: string[] = [];
  if (temperature !== null) parts.push(`${temperature}°`);
  if (condition) parts.push(condition.replace('-', ' '));
  if (windSpeed !== null) parts.push(`${windSpeed} km/h wind`);
  if (parts.length === 0) return null;

  return <p className="text-sm text-white/80 mt-1 capitalize">{parts.join(' · ')}</p>;
}

export function BeachDetail() {
  const { slug } = useParams<{ slug: string }>();
  const beach = slug ? getBeachById(slug) : undefined;
  const { tides } = useTides(slug);
  const { weather } = useWeather(slug);
  const { waterQuality } = useWaterQuality(slug);
  const { addRecent } = useRecentBeaches();

  const [activeTab, setActiveTab] = useState<BeachDetailTab>(getInitialTab);

  const sunTimes = useSunTimes(
    beach?.location.latitude ?? 49.27,
    beach?.location.longitude ?? -123.15,
  );
  const sunsetTime = formatSunTime(sunTimes.sunset);

  useEffect(() => {
    if (slug) addRecent(slug);
  }, [slug, addRecent]);

  const handleTabChange = (tab: BeachDetailTab) => {
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
  };

  if (!beach)
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">Beach not found</p>
        <p className="text-sand-600 dark:text-sand-400">
          Select a beach from the dropdown menu above.
        </p>
      </div>
    );

  const gradientIdx = beach.name.length % fallbackGradients.length;

  return (
    <div>
      {/* Compact hero image (~30vh) */}
      <div className="relative w-full h-[30vh] min-h-[200px] max-h-[320px] overflow-hidden">
        {beach.images ? (
          <img
            src={beach.images.hero}
            alt={beach.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradients[gradientIdx]}`} />
        )}

        {/* Lighter overlay: from-black/40 instead of from-black/70 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />

        {/* Photo credit */}
        {beach.images?.credit && (
          <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded">
            Photo by {beach.images.credit.name}
          </div>
        )}

        {/* Floating buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <FavoriteButton beachId={beach.id} beachName={beach.name} size="lg" />
          <ShareButton beachName={beach.name} beachId={beach.id} />
        </div>

        {/* Beach name + personality tagline at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto max-w-3xl px-4 pb-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white leading-tight">
              {beach.name}
            </h2>
            {beach.tagline && (
              <p className="text-base text-white/90 mt-0.5 font-medium">{beach.tagline}</p>
            )}
            {/* Quick conditions strip */}
            <HeroQuickConditions
              temperature={weather?.current?.temperature ?? null}
              condition={weather?.current?.condition ?? null}
              windSpeed={weather?.current?.windSpeed ?? null}
            />
          </div>
        </div>
      </div>

      {/* Sticky TabBar */}
      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {/* Tab content with animated transitions */}
      <div className="container mx-auto max-w-3xl px-4 pt-6">
        <AnimatePresence mode="wait">
          {activeTab === 'today' && (
            <motion.div
              key="today"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <TodayTab
                beach={beach}
                weather={weather}
                tides={tides}
                waterQuality={waterQuality}
                sunsetTime={sunsetTime}
              />
            </motion.div>
          )}
          {activeTab === 'about' && (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AboutTab beach={beach} waterQuality={waterQuality} weather={weather} />
            </motion.div>
          )}
          {activeTab === 'photos' && (
            <motion.div
              key="photos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <PhotosTab beach={beach} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
