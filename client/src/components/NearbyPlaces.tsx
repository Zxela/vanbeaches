import { Car, ShoppingBag, Utensils } from 'lucide-react';
import { Icon } from './ui';

interface NearbyPlacesProps {
  beachName: string;
}

const placeholders = [
  {
    icon: Utensils,
    title: 'Restaurants & Cafes',
    description: 'Places to eat nearby',
  },
  {
    icon: ShoppingBag,
    title: 'Rentals & Activities',
    description: 'Gear rentals and tours',
  },
  {
    icon: Car,
    title: 'Parking & Transit',
    description: 'Getting there and back',
  },
];

export function NearbyPlaces({ beachName }: NearbyPlacesProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-sand-900 dark:text-sand-100 mb-6">Near {beachName}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {placeholders.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border-2 border-dashed border-sand-200 dark:border-sand-700 p-6 text-center"
          >
            <div className="w-12 h-12 rounded-xl bg-sand-100 dark:bg-sand-800 flex items-center justify-center mx-auto mb-3">
              <Icon icon={item.icon} size="xl" className="text-sand-400 dark:text-sand-500" />
            </div>
            <h3 className="font-semibold text-sand-700 dark:text-sand-300 text-sm">{item.title}</h3>
            <p className="text-xs text-sand-400 dark:text-sand-500 mt-1">{item.description}</p>
            <span className="inline-block mt-3 text-xs text-sand-400 dark:text-sand-500 bg-sand-100 dark:bg-sand-800 px-3 py-1 rounded-full">
              Coming soon
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
