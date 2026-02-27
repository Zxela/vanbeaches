import type { Beach } from '@van-beaches/shared';
import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { BeachAmenities } from './BeachAmenities';
import { Card, CardContent, Icon } from './ui';

interface PlanYourVisitProps {
  beach: Beach;
}

export function PlanYourVisit({ beach }: PlanYourVisitProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${beach.location.latitude},${beach.location.longitude}`;

  return (
    <div className="space-y-6">
      {/* Getting there */}
      <Card variant="default">
        <CardContent className="p-5">
          <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 flex items-center gap-2 mb-4">
            <Icon icon={Navigation} size="lg" color="ocean" />
            Getting there
          </h3>
          <div className="flex items-start gap-3 mb-4">
            <Icon icon={MapPin} size="md" className="text-sand-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sand-700 dark:text-sand-300">{beach.name}, Vancouver, BC</p>
              {beach.amenities?.parking && beach.amenities.parking !== 'none' && (
                <p className="text-sm text-sand-500 dark:text-sand-400 mt-1">
                  {beach.amenities.parking === 'free' && 'Free parking available'}
                  {beach.amenities.parking === 'paid' && 'Paid parking available'}
                  {beach.amenities.parking === 'street' && 'Street parking nearby'}
                </p>
              )}
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Icon icon={ExternalLink} size="sm" />
            Get directions
          </a>
        </CardContent>
      </Card>

      {/* What's here */}
      <BeachAmenities amenities={beach.amenities} activities={beach.activities} />

      {/* About */}
      {beach.description && (
        <Card variant="default">
          <CardContent className="p-5">
            <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">
              About {beach.name}
            </h3>
            <p className="text-sand-600 dark:text-sand-400 leading-relaxed">{beach.description}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
