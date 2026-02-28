import type { Beach, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import {
  Accessibility,
  Dog,
  ExternalLink,
  MapPin,
  Navigation,
  Users,
  Volleyball,
} from 'lucide-react';
import { useState } from 'react';
import { getPersonality } from '../data/beach-personalities';
import { SafetyInfo } from './SafetyInfo';
import { WebcamEmbed } from './WebcamEmbed';

interface AboutTabProps {
  beach: Beach;
  waterQuality?: WaterQualityStatus | null;
  weather?: WeatherForecast | null;
}

export function AboutTab({ beach, waterQuality = null, weather = null }: AboutTabProps) {
  const personality = getPersonality(beach.id);
  const amenities = beach.amenities;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${beach.location.latitude},${beach.location.longitude}`;

  const [showWebcam, setShowWebcam] = useState(true);

  const hasFamilyAmenities =
    amenities &&
    (amenities.restrooms || amenities.lifeguard !== 'none' || amenities.wheelchairAccessible);
  const hasDogAmenities = amenities?.dogFriendly;
  const hasSportsAmenities = amenities && amenities.volleyballCourts > 0;

  return (
    <div className="space-y-8 pb-10">
      {/* Editorial description */}
      {personality && (
        <section>
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-3">
            About this beach
          </h2>
          <p className="text-sand-700 leading-relaxed">{personality.editorial}</p>
        </section>
      )}

      {/* What makes it special */}
      {personality && personality.differentiators.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-3">
            What makes it special
          </h2>
          <ul className="space-y-2">
            {personality.differentiators.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sand-700">
                <span
                  className="mt-1 w-2 h-2 rounded-full bg-ocean-400 shrink-0"
                  aria-hidden="true"
                />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Amenities grouped by use case */}
      {amenities && (hasFamilyAmenities || hasDogAmenities || hasSportsAmenities) && (
        <section className="space-y-5">
          {hasFamilyAmenities && (
            <div>
              <h3 className="font-display text-lg font-semibold text-sand-900 mb-2">
                For families
              </h3>
              <div className="flex flex-wrap gap-2">
                {amenities.restrooms && (
                  <AmenityChip icon={<MapPin className="w-4 h-4" />} label="Restrooms" />
                )}
                {amenities.lifeguard !== 'none' && (
                  <AmenityChip
                    icon={<Users className="w-4 h-4" />}
                    label={
                      amenities.lifeguard === 'year-round'
                        ? 'Year-round lifeguard'
                        : 'Seasonal lifeguard'
                    }
                  />
                )}
                {amenities.wheelchairAccessible && (
                  <AmenityChip
                    icon={<Accessibility className="w-4 h-4" />}
                    label="Wheelchair accessible"
                  />
                )}
              </div>
            </div>
          )}

          {hasDogAmenities && (
            <div>
              <h3 className="font-display text-lg font-semibold text-sand-900 mb-2">For dogs</h3>
              <AmenityChip icon={<Dog className="w-4 h-4" />} label="Dog friendly" />
            </div>
          )}

          {hasSportsAmenities && (
            <div>
              <h3 className="font-display text-lg font-semibold text-sand-900 mb-2">For sports</h3>
              <AmenityChip
                icon={<Volleyball className="w-4 h-4" />}
                label={`${amenities.volleyballCourts} volleyball court${amenities.volleyballCourts !== 1 ? 's' : ''}`}
              />
            </div>
          )}
        </section>
      )}

      {/* Getting there */}
      <section>
        <h2 className="font-display text-xl font-semibold text-sand-900 mb-3">Getting there</h2>
        <div className="rounded-2xl border border-sand-200 bg-white shadow-sm p-4 space-y-3">
          <div className="flex items-start gap-2 text-sand-700">
            <Navigation className="w-5 h-5 text-ocean-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {beach.name}, Vancouver, BC
              {amenities?.parking && amenities.parking !== 'none' && (
                <span className="block text-sm text-sand-500 mt-0.5">
                  {amenities.parking === 'free' && 'Free parking available'}
                  {amenities.parking === 'paid' && 'Paid parking available'}
                  {amenities.parking === 'street' && 'Street parking nearby'}
                </span>
              )}
            </span>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-ocean-500 hover:bg-ocean-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Open in Google Maps
          </a>
        </div>
      </section>

      {/* Safety */}
      <SafetyInfo beach={beach} waterQuality={waterQuality} weather={weather} />

      {/* Webcam */}
      {beach.webcamUrl && showWebcam && (
        <section>
          <h2 className="font-display text-xl font-semibold text-sand-900 mb-3">Webcam</h2>
          <WebcamEmbed
            url={beach.webcamUrl}
            beachName={beach.name}
            onHide={() => setShowWebcam(false)}
          />
        </section>
      )}
    </div>
  );
}

function AmenityChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm">
      {icon}
      {label}
    </span>
  );
}
