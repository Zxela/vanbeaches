import { useParams, Link } from 'react-router-dom';
import { getBeachById } from '@van-beaches/shared';
import { useTides } from '../hooks/useTides';
import { useWeather } from '../hooks/useWeather';
import { useWaterQuality } from '../hooks/useWaterQuality';
import { TideChart } from '../components/TideChart';
import { WeatherWidget } from '../components/WeatherWidget';
import { WaterQuality } from '../components/WaterQuality';
import { WebcamEmbed } from '../components/WebcamEmbed';

export function BeachDetail() {
  const { slug } = useParams<{ slug: string }>();
  const beach = slug ? getBeachById(slug) : undefined;
  const { tides, loading: tidesLoading, error: tidesError } = useTides(slug);
  const { weather, loading: weatherLoading, error: weatherError } = useWeather(slug);
  const { waterQuality, loading: wqLoading, error: wqError } = useWaterQuality(slug);

  if (!beach) return <div className="p-4"><p className="text-red-500">Beach not found</p><Link to="/" className="text-blue-600 hover:underline">Back to beaches</Link></div>;

  return (
    <div>
      <Link to="/" className="text-blue-600 hover:underline mb-4 inline-block">← Back to beaches</Link>
      <h2 className="text-2xl font-bold mb-6">{beach.name}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeatherWidget weather={weather} loading={weatherLoading} error={weatherError} />
        <TideChart predictions={tides?.predictions || []} loading={tidesLoading} error={tidesError} />
        <WaterQuality status={waterQuality} loading={wqLoading} error={wqError} />
        <WebcamEmbed url={beach.webcamUrl} beachName={beach.name} />
      </div>
    </div>
  );
}
