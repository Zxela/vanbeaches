import { getBeachById } from '@van-beaches/shared';
import { Image, Info, LayoutList } from 'lucide-react';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AboutTab } from '../components/AboutTab';
import { BeachNavigation } from '../components/BeachNavigation';
import { FavoriteButton } from '../components/FavoriteButton';
import { PhotosTab } from '../components/PhotosTab';
import { ShareButton } from '../components/ShareButton';
import { TodayTab } from '../components/TodayTab';
import { useRecentBeaches } from '../hooks/useRecentBeaches';
import { formatSunTime, useSunTimes } from '../hooks/useSunTimes';
import { useTides } from '../hooks/useTides';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { useWeather } from '../hooks/useWeather';
import { getWeatherIcon, weatherLabels } from '../lib/weatherIcons';

// Fallback gradients when no image is available
const fallbackGradients = [
  'from-ocean-400 to-sky-500',
  'from-shore-400 to-ocean-500',
  'from-sky-400 to-ocean-600',
  'from-ocean-500 to-shore-400',
];

const conditionThemes: Record<string, string> = {
  sunny: 'weather-sunny',
  'partly-cloudy': 'weather-partly-cloudy',
  cloudy: 'weather-cloudy',
  rainy: 'weather-rainy',
  stormy: 'weather-stormy',
  foggy: 'weather-foggy',
};

export function BeachDetail() {
  const { slug } = useParams<{ slug: string }>();
  const beach = slug ? getBeachById(slug) : undefined;
  const { tides } = useTides(slug);
  const { weather } = useWeather(slug);
  const { waterQuality } = useWaterQuality(slug);
  const { addRecent } = useRecentBeaches();

  const sunTimes = useSunTimes(
    beach?.location.latitude ?? 49.27,
    beach?.location.longitude ?? -123.15,
  );
  const sunsetTime = formatSunTime(sunTimes.sunset);

  useEffect(() => {
    if (slug) addRecent(slug);
  }, [slug, addRecent]);

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
  const condition = weather?.current.condition ?? 'partly-cloudy';
  const WeatherIcon = getWeatherIcon(condition);
  const today = weather?.daily?.[0];

  return (
    <div className={`weather-scene ${conditionThemes[condition] ?? conditionThemes.cloudy}`}>
      <div className="weather-atmosphere" aria-hidden="true" />
      <div className="relative w-full h-[30vh] min-h-[31rem] max-h-none overflow-hidden sm:min-h-[34rem]">
        {beach.images ? (
          <img
            src={beach.images.hero}
            alt={beach.name}
            className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-soft-light"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradients[gradientIdx]}`} />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/20" />

        {/* Photo credit */}
        {beach.images?.credit && (
          <div className="absolute bottom-2 right-2 bg-black/40 text-white text-xs px-2 py-1 rounded">
            Photo by {beach.images.credit.name}
          </div>
        )}

        <div className="absolute right-4 top-5 z-10 flex items-center gap-2 sm:top-7">
          <FavoriteButton beachId={beach.id} beachName={beach.name} size="lg" />
          <ShareButton beachName={beach.name} beachId={beach.id} />
        </div>

        <div className="absolute inset-0 flex items-center justify-center pt-14 text-center">
          <div className="container mx-auto max-w-3xl px-5">
            <p className="mb-1 text-sm font-medium tracking-wide text-white/75">Vancouver, BC</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm md:text-4xl">
              {beach.name}
            </h1>
            {weather ? (
              <>
                <p className="mt-2 text-[5.75rem] font-extralight leading-none tracking-[-0.08em] text-white drop-shadow-sm sm:text-[7rem]">
                  {Math.round(weather.current.temperature)}°
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-white/95">
                  <WeatherIcon className="h-6 w-6" strokeWidth={1.6} />
                  <p className="text-xl font-medium">{weatherLabels[condition]}</p>
                </div>
                {today && (
                  <p className="mt-1 text-base font-medium text-white">
                    H:{Math.round(today.high)}° &nbsp; L:{Math.round(today.low)}°
                  </p>
                )}
              </>
            ) : (
              <p className="mt-5 text-lg text-white/80">Loading current conditions…</p>
            )}
            {beach.tagline && (
              <p className="mt-8 text-sm font-medium text-white/70">{beach.tagline}</p>
            )}
          </div>
        </div>
      </div>

      <nav
        className="sticky top-0 z-30 border-y border-white/15 bg-slate-900/20 px-3 backdrop-blur-2xl"
        aria-label="Beach page sections"
      >
        <div className="mx-auto flex max-w-3xl justify-center gap-1 py-2">
          <SectionLink href="#today" icon={<LayoutList className="h-4 w-4" />} label="Forecast" />
          <SectionLink href="#about" icon={<Info className="h-4 w-4" />} label="Beach guide" />
          <SectionLink href="#photos" icon={<Image className="h-4 w-4" />} label="Community" />
        </div>
      </nav>

      <div className="container relative z-10 mx-auto max-w-3xl px-3 pb-8 sm:px-4">
        <section id="today" className="scroll-mt-16">
          <TodayTab
            beach={beach}
            weather={weather}
            tides={tides}
            waterQuality={waterQuality}
            sunsetTime={sunsetTime}
          />
        </section>

        <section id="about" className="scroll-mt-16 border-t border-white/15 pt-5">
          <div className="mb-3 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
              Beach guide
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Plan your visit</h2>
          </div>
          <AboutTab beach={beach} waterQuality={waterQuality} weather={weather} />
        </section>

        <details id="photos" className="weather-panel scroll-mt-16 group mb-8 overflow-hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-white marker:content-none">
            <span>
              <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/55">
                Community
              </span>
              <span className="mt-1 block text-lg font-semibold">Photos and local posts</span>
            </span>
            <span
              className="text-2xl font-light text-white/60 transition-transform group-open:rotate-45"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <div className="border-t border-white/15 px-1 pb-1">
            <PhotosTab beach={beach} />
          </div>
        </details>
      </div>

      {/* Previous/next beach navigation */}
      <BeachNavigation currentBeachId={beach.id} />
    </div>
  );
}

function SectionLink({
  href,
  icon,
  label,
}: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:text-white"
    >
      {icon}
      {label}
    </a>
  );
}
