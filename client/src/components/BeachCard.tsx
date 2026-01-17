import { Link } from 'react-router-dom';
import type { BeachSummary } from '@van-beaches/shared';

interface BeachCardProps { beach: BeachSummary; }

export function BeachCard({ beach }: BeachCardProps) {
  return (
    <Link to={'/beach/' + beach.id} className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4">
      <h3 className="text-lg font-semibold text-gray-900">{beach.name}</h3>
      <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
        {beach.currentWeather && <span>{beach.currentWeather.temperature}°C</span>}
        {beach.nextTide && <span>Next {beach.nextTide.type}: {beach.nextTide.time}</span>}
      </div>
    </Link>
  );
}
