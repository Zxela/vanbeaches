import { BEACHES } from '@van-beaches/shared';
import { useEffect, useMemo, useState } from 'react';

interface SearchFilterProps {
  onFilter: (beachIds: string[]) => void;
}

type IntentKey =
  | 'swimming'
  | 'waterSports'
  | 'dogFriendly'
  | 'sunset'
  | 'sports'
  | 'bonfire'
  | 'quiet'
  | 'family'
  | 'picnic'
  | 'cycling';

interface IntentDef {
  label: string;
  icon: string;
  key: IntentKey;
}

const INTENTS: IntentDef[] = [
  { label: 'Swimming', icon: '\u{1F3CA}', key: 'swimming' },
  { label: 'Water sports', icon: '\u{1F6A3}', key: 'waterSports' },
  { label: 'Dog friendly', icon: '\u{1F415}', key: 'dogFriendly' },
  { label: 'Sunset', icon: '\u{1F305}', key: 'sunset' },
  { label: 'Sports', icon: '\u{1F3D0}', key: 'sports' },
  { label: 'Bonfire', icon: '\u{1F525}', key: 'bonfire' },
  { label: 'Quiet escape', icon: '\u{1F343}', key: 'quiet' },
  { label: 'Family day', icon: '\u{1F46A}', key: 'family' },
  { label: 'Picnic', icon: '\u{1F9FA}', key: 'picnic' },
  { label: 'Cycling / walking', icon: '\u{1F6B4}', key: 'cycling' },
];

function matchesIntent(beach: (typeof BEACHES)[number], intent: IntentKey): boolean {
  switch (intent) {
    case 'swimming':
      return (
        (beach.activities?.some((a) => ['swimming', 'pool swimming', 'wading'].includes(a)) ??
          false)
      );
    case 'waterSports':
      return (
        (beach.activities?.some((a) =>
          ['kayaking', 'paddleboarding', 'sailing', 'windsurfing', 'kiteboarding'].includes(a),
        ) ?? false)
      );
    case 'dogFriendly':
      return beach.amenities?.dogFriendly === true;
    case 'sunset':
      return beach.activities?.includes('sunset viewing') ?? false;
    case 'sports':
      return (
        (beach.activities?.some((a) => ['volleyball', 'basketball', 'tennis'].includes(a)) ?? false)
      );
    case 'bonfire':
      return (
        beach.amenities?.firepits === true ||
        (beach.activities?.includes('bonfires') ?? false)
      );
    case 'quiet':
      return (
        (beach.activities?.some((a) =>
          ['beachcombing', 'birdwatching', 'photography'].includes(a),
        ) ?? false)
      );
    case 'family':
      return (
        (beach.amenities?.restrooms === true &&
          beach.amenities?.lifeguard !== 'none' &&
          beach.amenities?.wheelchairAccessible === true) ||
        (beach.activities?.includes('playground') ?? false)
      );
    case 'picnic':
      return beach.activities?.includes('picnicking') ?? false;
    case 'cycling':
      return (
        (beach.activities?.some((a) =>
          ['cycling', 'walking', 'hiking', 'rollerblading'].includes(a),
        ) ?? false)
      );
  }
}

export function SearchFilter({ onFilter }: SearchFilterProps) {
  const [activeIntents, setActiveIntents] = useState<Set<IntentKey>>(new Set());

  const filteredBeaches = useMemo(() => {
    return BEACHES.filter((beach) => {
      for (const intent of activeIntents) {
        if (!matchesIntent(beach, intent)) return false;
      }
      return true;
    });
  }, [activeIntents]);

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

  const hasFilters = activeIntents.size > 0;

  return (
    <div className="space-y-4">
      {/* Intent pills - wrapping layout */}
      <div className="flex flex-wrap gap-2">
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
