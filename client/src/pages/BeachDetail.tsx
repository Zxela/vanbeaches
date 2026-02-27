import { getBeachById } from '@van-beaches/shared';
import {
  Check,
  Droplets,
  RefreshCw,
  Sun,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Wind,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActivityRecommendations } from '../components/ActivityRecommendations';
import { BestTimeToVisit } from '../components/BestTimeToVisit';
import { FavoriteButton } from '../components/FavoriteButton';
import { FullscreenWebcam } from '../components/FullscreenWebcam';
import { NearbyPlaces } from '../components/NearbyPlaces';
import { PlanYourVisit } from '../components/PlanYourVisit';
import { ShareButton } from '../components/ShareButton';
import { SunTimesWidget } from '../components/SunTimesWidget';
import { TideCanvas } from '../components/TideCanvas';
import { TideForecast } from '../components/TideForecast';
import { WaterQuality } from '../components/WaterQuality';
import { WeatherForecast } from '../components/WeatherForecast';
import { WeatherWidget } from '../components/WeatherWidget';
import { WebcamEmbed } from '../components/WebcamEmbed';
import { WebcamPlaceholder } from '../components/WebcamPlaceholder';
import { Card, CardContent, Icon } from '../components/ui';
import { useRecentBeaches } from '../hooks/useRecentBeaches';
import { useTides } from '../hooks/useTides';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { useWeather } from '../hooks/useWeather';
import { useWebcamPreference } from '../hooks/useWebcamPreference';

// Fallback gradients when no image is available
const fallbackGradients = [
  'from-ocean-400 to-sky-500',
  'from-shore-400 to-ocean-500',
  'from-sky-400 to-ocean-600',
  'from-ocean-500 to-shore-400',
];

const waterQualityColors: Record<string, string> = {
  good: 'text-emerald-500',
  advisory: 'text-amber-500',
  closed: 'text-red-500',
  unknown: 'text-sand-400',
  'off-season': 'text-sky-400',
};

const waterQualityLabels: Record<string, string> = {
  good: 'Good',
  advisory: 'Advisory',
  closed: 'Closed',
  unknown: 'Unknown',
  'off-season': 'Off-season',
};

export function BeachDetail() {
  const { slug } = useParams<{ slug: string }>();
  const beach = slug ? getBeachById(slug) : undefined;
  const { tides, loading: tidesLoading, error: tidesError, refetch: refetchTides } = useTides(slug);
  const {
    weather,
    loading: weatherLoading,
    error: weatherError,
    refetch: refetchWeather,
  } = useWeather(slug);
  const {
    waterQuality,
    loading: wqLoading,
    error: wqError,
    refetch: refetchWaterQuality,
  } = useWaterQuality(slug);
  const { addRecent } = useRecentBeaches();
  const { isHidden, hide, show } = useWebcamPreference();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setRefreshSuccess(false);
    await Promise.all([refetchWeather(), refetchTides(), refetchWaterQuality()]);
    setIsRefreshing(false);
    setRefreshSuccess(true);
    setTimeout(() => setRefreshSuccess(false), 1500);
  }, [refetchWeather, refetchTides, refetchWaterQuality]);

  // Webcam visibility logic
  const webcamUrl = beach?.webcamUrl;
  const hasWebcam = webcamUrl !== null && webcamUrl !== undefined && beach?.showWebcam === true;
  const showWebcamEmbed = hasWebcam && !isHidden;
  const showPlaceholder = hasWebcam && isHidden;

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
  const nextTide = tides?.predictions?.[0];

  return (
    <div>
      {/* Full-bleed hero image */}
      <div className="relative w-full h-[40vh] min-h-[280px] max-h-[440px] overflow-hidden">
        {beach.images ? (
          <img
            src={beach.images.hero}
            alt={beach.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${fallbackGradients[gradientIdx]}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

        {/* Floating buttons */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh beach data"
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/30 backdrop-blur-md hover:bg-black/50 transition-colors text-white text-sm border border-white/20"
          >
            {refreshSuccess ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            )}
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <FavoriteButton beachId={beach.id} beachName={beach.name} size="lg" />
          <ShareButton beachName={beach.name} beachId={beach.id} />
        </div>

        {/* Beach name + tagline at bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto max-w-7xl px-4 pb-14">
            <h2 className="text-4xl md:text-5xl font-bold text-white">{beach.name}</h2>
            {beach.tagline && <p className="text-lg text-white/80 mt-1">{beach.tagline}</p>}
          </div>
        </div>
      </div>

      {/* At-a-glance summary bar - overlaps hero */}
      <div className="container mx-auto max-w-7xl px-4 -mt-8 relative z-10">
        <Card variant="elevated" padding="none" className="shadow-xl">
          <CardContent className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {/* Temperature */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                  <Icon icon={Thermometer} size="md" className="text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-sand-500 dark:text-sand-400">Temp</p>
                  <p className="font-semibold text-sand-900 dark:text-sand-100">
                    {weather?.current?.temperature != null
                      ? `${weather.current.temperature.toFixed(0)}°C`
                      : '--'}
                  </p>
                </div>
              </div>

              {/* Water Quality */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Icon icon={Droplets} size="md" className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-sand-500 dark:text-sand-400">Water</p>
                  <p
                    className={`font-semibold ${waterQualityColors[waterQuality?.level || 'unknown']}`}
                  >
                    {waterQualityLabels[waterQuality?.level || 'unknown']}
                  </p>
                </div>
              </div>

              {/* Next Tide */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-ocean-50 dark:bg-ocean-900/20 flex items-center justify-center">
                  <Icon
                    icon={nextTide?.type === 'high' ? TrendingUp : TrendingDown}
                    size="md"
                    className="text-ocean-500"
                  />
                </div>
                <div>
                  <p className="text-xs text-sand-500 dark:text-sand-400">Next Tide</p>
                  <p className="font-semibold text-sand-900 dark:text-sand-100">
                    {nextTide
                      ? `${nextTide.type === 'high' ? 'High' : 'Low'} ${new Date(nextTide.time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                      : '--'}
                  </p>
                </div>
              </div>

              {/* Wind */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Icon icon={Wind} size="md" className="text-sky-500" />
                </div>
                <div>
                  <p className="text-xs text-sand-500 dark:text-sand-400">Wind</p>
                  <p className="font-semibold text-sand-900 dark:text-sand-100">
                    {weather?.current?.windSpeed != null
                      ? `${weather.current.windSpeed} km/h`
                      : '--'}
                  </p>
                </div>
              </div>

              {/* UV Index */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Icon icon={Sun} size="md" className="text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-sand-500 dark:text-sand-400">UV Index</p>
                  <p className="font-semibold text-sand-900 dark:text-sand-100">
                    {weather?.current?.uvIndex != null ? weather.current.uvIndex : '--'}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content - narrative sections */}
      <div className="container mx-auto max-w-7xl px-4 py-8 space-y-12">
        {/* Section 1: Should you go today? */}
        <section>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6">
            Should you go today?
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BestTimeToVisit
              weather={weather}
              tides={tides}
              latitude={beach.location.latitude}
              longitude={beach.location.longitude}
            />
            <ActivityRecommendations weather={weather} activities={beach.activities} />
          </div>
        </section>

        {/* Section 2: Tides */}
        <section>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6">Tides</h2>
          <div className="space-y-6">
            <TideCanvas predictions={tides?.predictions || []} loading={tidesLoading} />
            <TideForecast
              predictions={tides?.predictions || []}
              loading={tidesLoading}
              error={tidesError}
            />
          </div>
        </section>

        {/* Section 3: Live conditions */}
        <section>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6">
            Live conditions
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <WeatherWidget weather={weather} loading={weatherLoading} error={weatherError} />
            <SunTimesWidget
              latitude={beach.location.latitude}
              longitude={beach.location.longitude}
            />
            <WaterQuality status={waterQuality} loading={wqLoading} error={wqError} />
          </div>
        </section>

        {/* Section 4: Webcam */}
        {(showWebcamEmbed || showPlaceholder) && (
          <section>
            {showWebcamEmbed && webcamUrl && (
              <div className="relative">
                <WebcamEmbed url={webcamUrl} beachName={beach.name} onHide={hide} />
                <FullscreenWebcam url={webcamUrl} beachName={beach.name} />
              </div>
            )}
            {showPlaceholder && <WebcamPlaceholder onShow={show} />}
          </section>
        )}

        {/* Section 5: Plan your visit */}
        <section>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6">
            Plan your visit
          </h2>
          <PlanYourVisit beach={beach} />
        </section>

        {/* Section 6: Weather forecast */}
        <section>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6">
            Weather forecast
          </h2>
          <WeatherForecast forecast={weather} loading={weatherLoading} />
        </section>

        {/* Section 7: Nearby places */}
        <NearbyPlaces beachName={beach.name} />
      </div>
    </div>
  );
}
