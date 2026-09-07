import { getBeachById } from '@van-beaches/shared';
import { Info, LayoutList } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AboutTab } from '../components/AboutTab';
import { BeachNavigation } from '../components/BeachNavigation';
import { TodayTab } from '../components/TodayTab';
import { useRecentBeaches } from '../hooks/useRecentBeaches';
import { useSunTimes } from '../hooks/useSunTimes';
import { useTides } from '../hooks/useTides';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { useWeather } from '../hooks/useWeather';
import { getWeatherIcon, weatherLabels } from '../lib/weatherIcons';
import { weatherTheme } from '../lib/weatherTheme';

export function BeachDetail() {
  const { slug } = useParams<{ slug: string }>();
  const beach = slug ? getBeachById(slug) : undefined;
  const { tides, error: tideError, refetch: refetchTides } = useTides(slug);
  const { weather, error: weatherError, refetch: refetchWeather } = useWeather(slug);
  const {
    waterQuality,
    error: waterQualityError,
    refetch: refetchWaterQuality,
  } = useWaterQuality(slug);
  const { addRecent } = useRecentBeaches();

  const sunTimes = useSunTimes(
    beach?.location.latitude ?? 49.27,
    beach?.location.longitude ?? -123.15,
  );
  const today = weather?.daily?.[0];
  const sunset = today?.sunset ?? sunTimes.sunset;
  const sunsetTime = typeof sunset === 'string' ? sunset : sunset.toISOString();

  useEffect(() => {
    if (beach) addRecent(beach.id);
  }, [beach, addRecent]);

  if (!beach)
    return (
      <div className="p-4 text-center">
        <p className="text-red-400 mb-4">Beach not found</p>
        <Link to="/discover" className="inline-flex min-h-11 items-center text-accent underline">
          Browse beaches
        </Link>
      </div>
    );

  const condition = weather?.current.condition ?? 'partly-cloudy';
  const WeatherIcon = getWeatherIcon(condition);

  return (
    <div className={`weather-scene ${weatherTheme(condition)}`}>
      <div className="weather-atmosphere" aria-hidden="true" />
      <div
        data-testid="beach-hero"
        className="relative flex min-h-[min(65svh,36rem)] items-center py-10 text-center safe-area-inset-top"
      >
        <div className="relative w-full">
          <div className="container mx-auto max-w-3xl px-5">
            <p className="mb-1 text-sm font-medium tracking-wide text-white/75">Vancouver, BC</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm md:text-4xl lg:text-5xl">
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
              <p className="mt-5 text-lg text-white/80">
                {weatherError ? 'Current conditions unavailable' : 'Loading current conditions…'}
              </p>
            )}
            {beach.tagline && (
              <p className="mt-8 text-sm font-medium text-white/85">{beach.tagline}</p>
            )}
          </div>
        </div>
      </div>

      <nav
        className="sticky top-0 z-30 border-y border-white/15 bg-slate-900/20 px-3 backdrop-blur-2xl"
        aria-label="Beach page sections"
      >
        <div className="mx-auto flex max-w-6xl justify-center lg:justify-start gap-1 py-2">
          <SectionLink href="#today" icon={<LayoutList className="h-4 w-4" />} label="Forecast" />
          <SectionLink href="#about" icon={<Info className="h-4 w-4" />} label="Beach guide" />
        </div>
      </nav>

      <div className="container relative z-10 mx-auto max-w-6xl px-3 pb-8 sm:px-4">
        <section id="today" className="scroll-mt-16">
          <TodayTab
            beach={beach}
            weather={weather}
            tides={tides}
            waterQuality={waterQuality}
            sunsetTime={sunsetTime}
            weatherError={weatherError}
            onRetryWeather={refetchWeather}
            tideError={tideError}
            onRetryTide={refetchTides}
            waterQualityError={waterQualityError}
            onRetryWaterQuality={refetchWaterQuality}
          />
        </section>

        <section id="about" className="scroll-mt-16 border-t border-white/15 pt-5">
          <div className="mb-3 px-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/85">
              Beach guide
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Plan your visit</h2>
          </div>
          <AboutTab beach={beach} waterQuality={waterQuality} weather={weather} />
        </section>
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
      className="flex min-h-11 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:text-white"
    >
      {icon}
      {label}
    </a>
  );
}
