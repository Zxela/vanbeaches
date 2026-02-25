import { BEACHES, type BeachAmenities } from '@van-beaches/shared';
import { BarChart3, TrendingDown, TrendingUp, Waves } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardTitle, Icon } from '../components/ui';
import { useTides } from '../hooks/useTides';
import { useWeather } from '../hooks/useWeather';
import { getWeatherColor, getWeatherIcon } from '../lib/weatherIcons';

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
      <div className="flex items-center gap-3">
        <Icon icon={BarChart3} size="xl" color="ocean" />
        <div>
          <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-50">Compare Beaches</h2>
          <p className="text-sand-500 dark:text-sand-400 mt-1">
            Select up to {MAX_COMPARE} beaches to compare
          </p>
        </div>
      </div>

      {/* Beach selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            {BEACHES.map((beach) => (
              <button
                type="button"
                key={beach.id}
                onClick={() => toggleBeach(beach.id)}
                disabled={!selected.includes(beach.id) && selected.length >= MAX_COMPARE}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selected.includes(beach.id)
                    ? 'bg-ocean-500 text-white'
                    : selected.length >= MAX_COMPARE
                      ? 'bg-sand-100 dark:bg-sand-700 text-sand-400 cursor-not-allowed'
                      : 'bg-sand-100 dark:bg-sand-700 text-sand-700 dark:text-sand-300 hover:bg-sand-200 dark:hover:bg-sand-600'
                }`}
              >
                {beach.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

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
        <Card>
          <CardContent className="p-12 text-center">
            <Icon icon={Waves} size="xl" color="ocean" className="mx-auto mb-4" />
            <p className="text-sand-500 dark:text-sand-400">
              Select beaches above to compare conditions
            </p>
          </CardContent>
        </Card>
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

  const WeatherIcon = weather ? getWeatherIcon(weather.current.condition) : null;
  const weatherColor = weather ? getWeatherColor(weather.current.condition) : '';

  return (
    <Card variant="ocean" className="overflow-hidden">
      <div className="bg-gradient-to-r from-ocean-500 to-ocean-400 px-4 py-3">
        <CardTitle className="text-white">{beachName}</CardTitle>
      </div>

      <CardContent className="p-4 space-y-4">
        {/* Weather */}
        <div>
          <h4 className="text-sm font-medium text-sand-500 dark:text-sand-400 mb-2">Weather</h4>
          {wLoading ? (
            <div className="animate-pulse h-12 bg-sand-200 dark:bg-sand-700 rounded" />
          ) : weather ? (
            <div className="flex items-center gap-3">
              {WeatherIcon && <Icon icon={WeatherIcon} size="xl" className={weatherColor} />}
              <div>
                <p className="text-2xl font-bold text-sand-900 dark:text-sand-50">
                  {weather.current.temperature.toFixed(0)}°C
                </p>
                <p className="text-sm text-sand-500 dark:text-sand-400">
                  {weather.current.windSpeed} km/h wind
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sand-400">Unavailable</p>
          )}
        </div>

        {/* Tide */}
        <div>
          <h4 className="text-sm font-medium text-sand-500 dark:text-sand-400 mb-2">Next Tide</h4>
          {tLoading ? (
            <div className="animate-pulse h-8 bg-sand-200 dark:bg-sand-700 rounded" />
          ) : nextTide ? (
            <div className="flex items-center gap-2">
              <Icon
                icon={nextTide.type === 'high' ? TrendingUp : TrendingDown}
                size="sm"
                className={nextTide.type === 'high' ? 'text-ocean-500' : 'text-ocean-400'}
              />
              <span className="text-sand-900 dark:text-sand-50 capitalize">{nextTide.type}</span>
              <span className="text-sand-500 dark:text-sand-400">
                {new Date(nextTide.time).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
              <span className="font-mono text-sand-700 dark:text-sand-300">
                {nextTide.height.toFixed(1)}m
              </span>
            </div>
          ) : (
            <p className="text-sand-400">N/A</p>
          )}
        </div>

        {/* Amenities summary */}
        {amenities && (
          <div>
            <h4 className="text-sm font-medium text-sand-500 dark:text-sand-400 mb-2">Amenities</h4>
            <div className="flex flex-wrap gap-1 text-sand-600 dark:text-sand-300">
              {amenities.restrooms && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Restrooms</span>}
              {amenities.showers && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Showers</span>}
              {amenities.lifeguard !== 'none' && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Lifeguard</span>}
              {amenities.foodNearby && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Food</span>}
              {amenities.dogFriendly && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Dogs OK</span>}
              {amenities.wheelchairAccessible && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Accessible</span>}
              {amenities.volleyballCourts > 0 && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Volleyball</span>}
              {amenities.firepits && <span className="text-sm px-2 py-0.5 bg-sand-100 dark:bg-sand-700 rounded-full">Firepits</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
