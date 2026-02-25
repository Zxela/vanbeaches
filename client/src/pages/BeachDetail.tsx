import { getBeachById } from '@van-beaches/shared';
import { Check, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActivityRecommendations } from '../components/ActivityRecommendations';
import { BeachAmenities } from '../components/BeachAmenities';
import { BestTimeToVisit } from '../components/BestTimeToVisit';
import { FavoriteButton } from '../components/FavoriteButton';
import { FullscreenWebcam } from '../components/FullscreenWebcam';
import { ShareButton } from '../components/ShareButton';
import { SunTimesWidget } from '../components/SunTimesWidget';
import { TideCanvas } from '../components/TideCanvas';
import { TideForecast } from '../components/TideForecast';
import { WaterQuality } from '../components/WaterQuality';
import { WeatherForecast } from '../components/WeatherForecast';
import { WeatherWidget } from '../components/WeatherWidget';
import { WebcamEmbed } from '../components/WebcamEmbed';
import { WebcamPlaceholder } from '../components/WebcamPlaceholder';
import { useRecentBeaches } from '../hooks/useRecentBeaches';
import { useTides } from '../hooks/useTides';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { useWeather } from '../hooks/useWeather';
import { useWebcamPreference } from '../hooks/useWebcamPreference';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-sand-900 dark:text-sand-50">{beach.name}</h2>
          {weather?.fetchedAt && (
            <p className="text-sm text-sand-500 dark:text-sand-400 mt-1">
              Last updated:{' '}
              {Math.floor((Date.now() - new Date(weather.fetchedAt).getTime()) / 60000)} min ago
            </p>
          )}
          {beach.description && (
            <p className="text-sand-600 dark:text-sand-400 mt-2 max-w-2xl">{beach.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh beach data"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sand-100 dark:bg-sand-700 hover:bg-sand-200 dark:hover:bg-sand-600 transition-colors text-sand-700 dark:text-sand-300 text-sm"
          >
            {refreshSuccess ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            )}
            <span>Refresh</span>
          </button>
          <FavoriteButton beachId={beach.id} beachName={beach.name} size="lg" />
          <ShareButton beachName={beach.name} beachId={beach.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {showWebcamEmbed && webcamUrl && (
            <div className="relative">
              <WebcamEmbed url={webcamUrl} beachName={beach.name} onHide={hide} />
              <FullscreenWebcam url={webcamUrl} beachName={beach.name} />
            </div>
          )}
          {showPlaceholder && <WebcamPlaceholder onShow={show} />}
          <BestTimeToVisit
            weather={weather}
            tides={tides}
            latitude={beach.location.latitude}
            longitude={beach.location.longitude}
          />
          <TideCanvas predictions={tides?.predictions || []} loading={tidesLoading} />
          <TideForecast
            predictions={tides?.predictions || []}
            loading={tidesLoading}
            error={tidesError}
          />
        </div>
        <div className="space-y-6">
          <WeatherWidget weather={weather} loading={weatherLoading} error={weatherError} />
          <ActivityRecommendations weather={weather} activities={beach.activities} />
          <SunTimesWidget latitude={beach.location.latitude} longitude={beach.location.longitude} />
          <WeatherForecast forecast={weather} loading={weatherLoading} />
          <WaterQuality status={waterQuality} loading={wqLoading} error={wqError} />
          <BeachAmenities amenities={beach.amenities} activities={beach.activities} />
        </div>
      </div>
    </div>
  );
}
