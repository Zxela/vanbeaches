import type { BeachAmenities as AmenitiesType } from '@van-beaches/shared';
import { MapPin } from 'lucide-react';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface BeachAmenitiesProps {
  amenities?: AmenitiesType;
  activities?: string[];
}

const parkingLabels = {
  free: 'Free Parking',
  paid: 'Paid Parking',
  street: 'Street Parking',
  none: 'No Parking',
};
const lifeguardLabels = {
  seasonal: 'Seasonal Lifeguard',
  'year-round': 'Year-round Lifeguard',
  none: 'No Lifeguard',
};

export function BeachAmenities({ amenities, activities }: BeachAmenitiesProps) {
  if (!amenities && !activities) return null;

  return (
    <Card variant="default">
      <CardTitle className="flex items-center gap-2">
        <Icon icon={MapPin} size="lg" color="ocean" />
        Amenities & Info
      </CardTitle>
      <CardContent className="mt-4">
        {amenities && (
          <div className="grid grid-cols-2 gap-2 mb-4">
            <AmenityBadge
              icon="🅿️"
              label={parkingLabels[amenities.parking]}
              active={amenities.parking !== 'none'}
            />
            <AmenityBadge icon="🚻" label="Restrooms" active={amenities.restrooms} />
            <AmenityBadge icon="🚿" label="Showers" active={amenities.showers} />
            <AmenityBadge
              icon="🛟"
              label={lifeguardLabels[amenities.lifeguard]}
              active={amenities.lifeguard !== 'none'}
            />
            <AmenityBadge icon="🍔" label="Food Nearby" active={amenities.foodNearby} />
            <AmenityBadge icon="🐕" label="Dog Friendly" active={amenities.dogFriendly} />
            <AmenityBadge icon="♿" label="Accessible" active={amenities.wheelchairAccessible} />
            {amenities.volleyballCourts > 0 && (
              <AmenityBadge
                icon="🏐"
                label={`${amenities.volleyballCourts} Volleyball Courts`}
                active
              />
            )}
            {amenities.firepits && <AmenityBadge icon="🔥" label="Fire Pits" active />}
          </div>
        )}

        {activities && activities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-sand-700 dark:text-sand-300 mb-2">
              Popular Activities
            </h4>
            <div className="flex flex-wrap gap-2">
              {activities.map((activity) => (
                <span
                  key={activity}
                  className="px-2 py-1 bg-ocean-50 dark:bg-ocean-900/30 text-ocean-700 dark:text-ocean-300 text-xs rounded-full capitalize"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AmenityBadge({ icon, label, active }: { icon: string; label: string; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
        active
          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-sand-50 dark:bg-sand-700 text-sand-400 dark:text-sand-500'
      }`}
    >
      <span>{icon}</span>
      <span className={active ? '' : 'line-through'}>{label}</span>
    </div>
  );
}
