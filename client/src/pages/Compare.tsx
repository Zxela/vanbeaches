import { BEACHES, type BeachAmenities } from '@van-beaches/shared';
import { useState } from 'react';
import { useTides } from '../hooks/useTides';
import { useWeather } from '../hooks/useWeather';

const MAX_COMPARE = 3;

export function Compare() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggleBeach = (beachId: string) => {
    setSelected((prev) => {
      if (prev.includes(beachId)) return prev.filter((id) => id !== beachId);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, beachId];
    });
  };

  const selectedBeaches = BEACHES.filter((b) => selected.includes(b.id));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Compare Beaches</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Select up to {MAX_COMPARE} beaches to compare
        </p>
      </div>

      {/* Beach selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <div className="flex flex-wrap gap-2">
          {BEACHES.map((beach) => (
            <button
              type="button"
              key={beach.id}
              onClick={() => toggleBeach(beach.id)}
              disabled={!selected.includes(beach.id) && selected.length >= MAX_COMPARE}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selected.includes(beach.id)
                  ? 'bg-blue-500 text-white'
                  : selected.length >= MAX_COMPARE
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {beach.name}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison grid */}
      {selectedBeaches.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {selectedBeaches.map((beach) => (
            <CompareCard
              key={beach.id}
              beachId={beach.id}
              beachName={beach.name}
              amenities={beach.amenities}
            />
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
          <span className="text-4xl mb-4 block">🏖️</span>
          <p className="text-gray-500 dark:text-gray-400">
            Select beaches above to compare conditions
          </p>
        </div>
      )}
    </div>
  );
}

function CompareCard({
  beachId,
  beachName,
  amenities,
}: { beachId: string; beachName: string; amenities?: BeachAmenities }) {
  const { weather, loading: wLoading } = useWeather(beachId);
  const { tides, loading: tLoading } = useTides(beachId);

  const nextTide = tides?.predictions?.[0];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-3">
        <h3 className="text-lg font-semibold text-white">{beachName}</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Weather */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Weather</h4>
          {wLoading ? (
            <div className="animate-pulse h-12 bg-gray-200 dark:bg-gray-700 rounded" />
          ) : weather ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl">{getWeatherIcon(weather.current.condition)}</span>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {weather.current.temperature.toFixed(0)}°C
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {weather.current.windSpeed} km/h wind
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">Unavailable</p>
          )}
        </div>

        {/* Tide */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Next Tide</h4>
          {tLoading ? (
            <div className="animate-pulse h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ) : nextTide ? (
            <div className="flex items-center gap-2">
              <span className={nextTide.type === 'high' ? 'text-cyan-500' : 'text-blue-400'}>
                {nextTide.type === 'high' ? '▲' : '▼'}
              </span>
              <span className="text-gray-900 dark:text-white capitalize">{nextTide.type}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(nextTide.time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span className="font-mono text-gray-700 dark:text-gray-300">
                {nextTide.height.toFixed(1)}m
              </span>
            </div>
          ) : (
            <p className="text-gray-400">N/A</p>
          )}
        </div>

        {/* Amenities summary */}
        {amenities && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Amenities</h4>
            <div className="flex flex-wrap gap-1">
              {amenities.restrooms && <span className="text-sm">🚻</span>}
              {amenities.showers && <span className="text-sm">🚿</span>}
              {amenities.lifeguard !== 'none' && <span className="text-sm">🛟</span>}
              {amenities.foodNearby && <span className="text-sm">🍔</span>}
              {amenities.dogFriendly && <span className="text-sm">🐕</span>}
              {amenities.wheelchairAccessible && <span className="text-sm">♿</span>}
              {amenities.volleyballCourts > 0 && <span className="text-sm">🏐</span>}
              {amenities.firepits && <span className="text-sm">🔥</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getWeatherIcon(condition: string): string {
  const icons: Record<string, string> = {
    sunny: '☀️',
    'partly-cloudy': '⛅',
    cloudy: '☁️',
    rainy: '🌧️',
    stormy: '⛈️',
    foggy: '🌫️',
  };
  return icons[condition] || '🌡️';
}
