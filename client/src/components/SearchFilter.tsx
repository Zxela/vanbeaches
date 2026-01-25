import { BEACHES } from '@van-beaches/shared';
import { useMemo, useState } from 'react';

interface SearchFilterProps {
  onFilter: (beachIds: string[]) => void;
}

type FilterKey = 'dogFriendly' | 'hasWebcam' | 'lifeguard' | 'firepits' | 'volleyball';

export function SearchFilter({ onFilter }: SearchFilterProps) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    dogFriendly: false,
    hasWebcam: false,
    lifeguard: false,
    firepits: false,
    volleyball: false,
  });

  const filteredBeaches = useMemo(() => {
    return BEACHES.filter((beach) => {
      // Search filter
      if (search && !beach.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Feature filters
      if (filters.dogFriendly && !beach.amenities?.dogFriendly) return false;
      if (filters.hasWebcam && beach.webcamUrl === null) return false;
      if (filters.lifeguard && beach.amenities?.lifeguard === 'none') return false;
      if (filters.firepits && !beach.amenities?.firepits) return false;
      if (
        filters.volleyball &&
        (!beach.amenities?.volleyballCourts || beach.amenities.volleyballCourts === 0)
      )
        return false;

      return true;
    });
  }, [search, filters]);

  useMemo(() => {
    onFilter(filteredBeaches.map((b) => b.id));
  }, [filteredBeaches, onFilter]);

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search beaches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 pl-10 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <FilterChip
          label="Dog Friendly"
          icon="🐕"
          active={filters.dogFriendly}
          onClick={() => toggleFilter('dogFriendly')}
        />
        <FilterChip
          label="Webcam"
          icon="📷"
          active={filters.hasWebcam}
          onClick={() => toggleFilter('hasWebcam')}
        />
        <FilterChip
          label="Lifeguard"
          icon="🛟"
          active={filters.lifeguard}
          onClick={() => toggleFilter('lifeguard')}
        />
        <FilterChip
          label="Fire Pits"
          icon="🔥"
          active={filters.firepits}
          onClick={() => toggleFilter('firepits')}
        />
        <FilterChip
          label="Volleyball"
          icon="🏐"
          active={filters.volleyball}
          onClick={() => toggleFilter('volleyball')}
        />
      </div>

      {(search || activeFilterCount > 0) && (
        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredBeaches.length} of {BEACHES.length} beaches
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  icon,
  active,
  onClick,
}: { label: string; icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition-colors ${
        active
          ? 'bg-blue-500 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
