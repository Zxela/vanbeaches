import { BEACHES } from '@van-beaches/shared';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Card, Icon } from './ui';

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
      if (search && !beach.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
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

  useEffect(() => {
    onFilter(filteredBeaches.map((b) => b.id));
  }, [filteredBeaches, onFilter]);

  const toggleFilter = (key: FilterKey) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Card variant="default" className="p-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search beaches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 pl-10 bg-sand-50 dark:bg-sand-700 border border-sand-200 dark:border-sand-600 rounded-lg text-sand-900 dark:text-sand-100 placeholder-sand-500 dark:placeholder-sand-400 focus:outline-none focus:ring-2 focus:ring-ocean-500"
        />
        <Icon
          icon={Search}
          size="sm"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600"
          >
            <Icon icon={X} size="sm" />
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
        <div className="mt-3 text-sm text-sand-500 dark:text-sand-400">
          Showing {filteredBeaches.length} of {BEACHES.length} beaches
        </div>
      )}
    </Card>
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
          ? 'bg-ocean-500 text-white'
          : 'bg-sand-100 dark:bg-sand-700 text-sand-700 dark:text-sand-300 hover:bg-sand-200 dark:hover:bg-sand-600'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
