import { BEACHES } from '@van-beaches/shared';
import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Icon } from './ui';

interface SearchFilterProps {
  onFilter: (beachIds: string[]) => void;
}

type IntentKey = 'swimming' | 'dogWalk' | 'sunset' | 'sports' | 'bonfire' | 'quiet' | 'family';

interface IntentDef {
  label: string;
  icon: string;
  key: IntentKey;
}

const INTENTS: IntentDef[] = [
  { label: 'Go swimming', icon: '\u{1F3CA}', key: 'swimming' },
  { label: 'Walk my dog', icon: '\u{1F415}', key: 'dogWalk' },
  { label: 'Watch sunset', icon: '\u{1F305}', key: 'sunset' },
  { label: 'Play sports', icon: '\u{1F3D0}', key: 'sports' },
  { label: 'Have a bonfire', icon: '\u{1F525}', key: 'bonfire' },
  { label: 'Somewhere quiet', icon: '\u{1F343}', key: 'quiet' },
  { label: 'Family day', icon: '\u{1F46A}', key: 'family' },
];

function matchesIntent(beach: (typeof BEACHES)[number], intent: IntentKey): boolean {
  switch (intent) {
    case 'swimming':
      return beach.activities?.includes('swimming') ?? false;
    case 'dogWalk':
      return beach.amenities?.dogFriendly === true;
    case 'sunset':
      return beach.activities?.includes('sunset viewing') ?? false;
    case 'sports':
      return (
        (beach.amenities?.volleyballCourts ?? 0) > 0 ||
        (beach.activities?.some((a) =>
          ['volleyball', 'basketball', 'tennis', 'kiteboarding'].includes(a),
        ) ??
          false)
      );
    case 'bonfire':
      return beach.amenities?.firepits === true;
    case 'quiet':
      return beach.amenities?.lifeguard === 'none' && !beach.amenities?.foodNearby;
    case 'family':
      return (
        beach.amenities?.restrooms === true &&
        beach.amenities?.lifeguard !== 'none' &&
        beach.amenities?.wheelchairAccessible === true
      );
  }
}

export function SearchFilter({ onFilter }: SearchFilterProps) {
  const [search, setSearch] = useState('');
  const [activeIntents, setActiveIntents] = useState<Set<IntentKey>>(new Set());

  const filteredBeaches = useMemo(() => {
    return BEACHES.filter((beach) => {
      if (search && !beach.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      for (const intent of activeIntents) {
        if (!matchesIntent(beach, intent)) return false;
      }
      return true;
    });
  }, [search, activeIntents]);

  useEffect(() => {
    onFilter(filteredBeaches.map((b) => b.id));
  }, [filteredBeaches, onFilter]);

  const toggleIntent = (key: IntentKey) => {
    setActiveIntents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const hasFilters = search || activeIntents.size > 0;

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search beaches..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-5 py-3.5 pl-12 bg-white dark:bg-sand-800 border border-sand-200 dark:border-sand-700 rounded-2xl text-sand-900 dark:text-sand-100 placeholder-sand-400 dark:placeholder-sand-500 focus:outline-none focus:ring-2 focus:ring-ocean-500 shadow-sm text-base"
        />
        <Icon
          icon={Search}
          size="md"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-sand-400"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-sand-400 hover:text-sand-600"
          >
            <Icon icon={X} size="sm" />
          </button>
        )}
      </div>

      {/* Intent pills - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {INTENTS.map((intent) => (
          <button
            key={intent.key}
            type="button"
            onClick={() => toggleIntent(intent.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeIntents.has(intent.key)
                ? 'bg-ocean-500 text-white shadow-md'
                : 'bg-white dark:bg-sand-800 text-sand-700 dark:text-sand-300 border border-sand-200 dark:border-sand-700 hover:border-ocean-300 dark:hover:border-ocean-600 hover:bg-ocean-50 dark:hover:bg-ocean-900/20'
            }`}
          >
            <span>{intent.icon}</span>
            <span>{intent.label}</span>
          </button>
        ))}
      </div>

      {hasFilters && (
        <p className="text-sm text-sand-500 dark:text-sand-400">
          Showing {filteredBeaches.length} of {BEACHES.length} beaches
        </p>
      )}
    </div>
  );
}
