import type { BeachAmenities as AmenitiesType } from '@van-beaches/shared';
import {
  Accessibility,
  Bath,
  Circle,
  Dog,
  Flame,
  type LucideIcon,
  MapPin,
  ParkingCircle,
  ShieldCheck,
  ShowerHead,
  UtensilsCrossed,
} from 'lucide-react';
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
              icon={ParkingCircle}
              label={parkingLabels[amenities.parking]}
              active={amenities.parking !== 'none'}
            />
            <AmenityBadge icon={Bath} label="Restrooms" active={amenities.restrooms} />
            <AmenityBadge icon={ShowerHead} label="Showers" active={amenities.showers} />
            <AmenityBadge
              icon={ShieldCheck}
              label={lifeguardLabels[amenities.lifeguard]}
              active={amenities.lifeguard !== 'none'}
            />
            <AmenityBadge
              icon={UtensilsCrossed}
              label="Food Nearby"
              active={amenities.foodNearby}
            />
            <AmenityBadge icon={Dog} label="Dog Friendly" active={amenities.dogFriendly} />
            <AmenityBadge
              icon={Accessibility}
              label="Accessible"
              active={amenities.wheelchairAccessible}
            />
            {amenities.volleyballCourts > 0 && (
              <AmenityBadge
                icon={Circle}
                label={`${amenities.volleyballCourts} Volleyball Courts`}
                active
              />
            )}
            {amenities.firepits && <AmenityBadge icon={Flame} label="Fire Pits" active />}
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

function AmenityBadge({
  icon: IconComponent,
  label,
  active,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm ${
        active ? 'bg-emerald-50 text-emerald-700' : 'bg-sand-50 text-sand-400'
      }`}
    >
      <IconComponent
        size={16}
        className={active ? 'text-emerald-600' : 'text-sand-400'}
        aria-hidden="true"
      />
      <span className={active ? '' : 'line-through'}>{label}</span>
    </div>
  );
}
