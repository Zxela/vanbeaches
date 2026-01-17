import { getBeachById } from '@van-beaches/shared';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ActivityRecommendations } from '../components/ActivityRecommendations';
import { BeachAmenities } from '../components/BeachAmenities';
import { BestTimeToVisit } from '../components/BestTimeToVisit';
import { FavoriteButton } from '../components/FavoriteButton';
import { FullscreenWebcam } from '../components/FullscreenWebcam';
import { ShareButton } from '../components/ShareButton';
import { SunTimesWidget } from '../components/SunTimesWidget';
import { TideChart } from '../components/TideChart';
import { TideTimeline } from '../components/TideTimeline';
import { WaterQuality } from '../components/WaterQuality';
import { WeatherForecast } from '../components/WeatherForecast';
import { WeatherWidget } from '../components/WeatherWidget';
import { WebcamEmbed } from '../components/WebcamEmbed';
import { useRecentBeaches } from '../hooks/useRecentBeaches';
import { useTides } from '../hooks/useTides';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { useWeather } from '../hooks/useWeather';

export function BeachDetail() {
  const { slug } = useParams<{ slug: string }>();
  const beach = slug ? getBeachById(slug) : undefined;
  const { tides, loading: tidesLoading, error: tidesError } = useTides(slug);
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(slug);
  const { waterQuality, loading: wqLoading, error: wqError } = useWaterQuality(slug);
  const { addRecent } = useRecentBeaches();

  useEffect(() => {
    if (slug) addRecent(slug);
  }, [slug, addRecent]);

  if (!beach)
    return (
      <div className="p-4 text-center">
        <p className="text-red-500 dark:text-red-400 mb-4">Beach not found</p>
        <p className="text-gray-600 dark:text-gray-400">
          Select a beach from the dropdown menu above.
        </p>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{beach.name}</h2>
          {beach.description && (
            <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl">{beach.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <FavoriteButton beachId={beach.id} size="lg" />
          <ShareButton beachName={beach.name} beachId={beach.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="relative">
            <WebcamEmbed
              url={beach.webcamUrl}
              beachName={beach.name}
              photoUrl={beach.photoUrl}
              photoCredit={beach.photoCredit}
              photoCreditUrl={beach.photoCreditUrl}
            />
            <FullscreenWebcam url={beach.photoUrl || beach.webcamUrl} beachName={beach.name} />
          </div>
          <BestTimeToVisit
            weather={weather}
            tides={tides}
            latitude={beach.location.latitude}
            longitude={beach.location.longitude}
          />
          <TideTimeline predictions={tides?.predictions || []} loading={tidesLoading} />
          <TideChart
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
