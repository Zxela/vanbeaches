import { BEACHES } from '@van-beaches/shared';
import { useNavigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';

interface BeachMapProps {
  selectedBeachId?: string;
  onSelectBeach?: (beachId: string) => void;
}

export function BeachMap({ selectedBeachId, onSelectBeach }: BeachMapProps) {
  const navigate = useNavigate();
  const { isFavorite } = useFavorites();

  // Vancouver bounds - adjusted to show coastline nicely
  const bounds = {
    minLat: 49.24,
    maxLat: 49.32,
    minLng: -123.26,
    maxLng: -123.04,
  };

  const mapToPosition = (lat: number, lng: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 100;
    return { x, y };
  };

  const handleClick = (beachId: string) => {
    if (onSelectBeach) {
      onSelectBeach(beachId);
    } else {
      navigate(`/beach/${beachId}`);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Beach Map</h3>
      <div className="relative aspect-[16/9] rounded-lg overflow-hidden">
        {/* SVG Map of Vancouver coastline */}
        <svg
          viewBox="0 0 100 56.25"
          className="absolute inset-0 w-full h-full"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          {/* Ocean background */}
          <rect
            x="0"
            y="0"
            width="100"
            height="56.25"
            fill="#3B82F6"
            className="dark:fill-blue-900"
          />

          {/* Vancouver mainland - simplified coastline */}
          <path
            d="M 0 0 L 100 0 L 100 20
               C 95 22, 90 24, 85 23
               C 80 22, 75 25, 70 28
               C 65 31, 60 30, 55 32
               C 50 34, 45 35, 40 34
               C 35 33, 30 36, 25 38
               C 20 40, 15 38, 10 40
               C 5 42, 2 44, 0 45
               L 0 0 Z"
            fill="#22C55E"
            className="dark:fill-green-800"
          />

          {/* Stanley Park peninsula */}
          <path
            d="M 70 28
               C 72 30, 75 31, 78 30
               C 80 29, 82 31, 80 33
               C 78 35, 74 34, 72 32
               C 70 30, 68 29, 70 28 Z"
            fill="#16A34A"
            className="dark:fill-green-700"
          />

          {/* Point Grey/UBC area */}
          <path
            d="M 0 45
               C 3 43, 8 44, 12 46
               C 15 48, 10 52, 5 54
               C 2 55, 0 56, 0 56.25 L 0 45 Z"
            fill="#22C55E"
            className="dark:fill-green-800"
          />

          {/* False Creek indent */}
          <path
            d="M 78 33
               Q 82 35, 85 34
               Q 88 33, 90 35
               Q 92 37, 90 38
               Q 85 40, 80 38
               Q 77 36, 78 33 Z"
            fill="#3B82F6"
            className="dark:fill-blue-900"
          />

          {/* English Bay curve */}
          <path
            d="M 55 32 Q 60 34, 65 33 Q 70 32, 72 34"
            stroke="#60A5FA"
            strokeWidth="0.5"
            fill="none"
            className="dark:stroke-blue-700"
          />

          {/* Beach sand areas */}
          {BEACHES.map((beach) => {
            const pos = mapToPosition(beach.location.latitude, beach.location.longitude);
            return (
              <circle
                key={`${beach.id}-sand`}
                cx={pos.x}
                cy={pos.y}
                r="1.5"
                fill="#FDE68A"
                className="dark:fill-yellow-600"
                opacity="0.6"
              />
            );
          })}
        </svg>

        {/* Beach markers overlay */}
        {BEACHES.map((beach) => {
          const pos = mapToPosition(beach.location.latitude, beach.location.longitude);
          const isSelected = beach.id === selectedBeachId;
          const isFav = isFavorite(beach.id);

          return (
            <button
              type="button"
              key={beach.id}
              onClick={() => handleClick(beach.id)}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group z-10"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <div
                className={`
                w-4 h-4 rounded-full border-2 transition-all shadow-md
                ${
                  isSelected
                    ? 'bg-orange-500 border-white scale-150 shadow-lg'
                    : isFav
                      ? 'bg-red-500 border-white hover:scale-125'
                      : 'bg-white border-gray-700 hover:scale-125 hover:border-orange-500'
                }
              `}
              >
                {isFav && !isSelected && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-[8px]">
                    ♥
                  </span>
                )}
              </div>
              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  {beach.name}
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-600 dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-white border-2 border-gray-700 shadow-sm" />{' '}
          Beach
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm flex items-center justify-center text-white text-[6px]">
            ♥
          </span>{' '}
          Favorite
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />{' '}
          Selected
        </span>
      </div>
    </div>
  );
}
