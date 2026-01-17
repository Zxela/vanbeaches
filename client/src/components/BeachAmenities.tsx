import type { BeachAmenities as AmenitiesType } from '@van-beaches/shared';

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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Amenities & Info</h3>

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
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Popular Activities
          </h4>
          <div className="flex flex-wrap gap-2">
            {activities.map((activity) => (
              <span
                key={activity}
                className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full capitalize"
              >
                {activity}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AmenityBadge({ icon, label, active }: { icon: string; label: string; active: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
        active
          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : 'bg-gray-50 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
      }`}
    >
      <span>{icon}</span>
      <span className={active ? '' : 'line-through'}>{label}</span>
    </div>
  );
}
