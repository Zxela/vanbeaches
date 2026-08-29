import type { Beach, WaterQualityStatus, WeatherForecast } from '@van-beaches/shared';
import { BEACHES } from '@van-beaches/shared';
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
import { beachPersonalities, getPersonality } from '../data/beach-personalities';
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
    <div className="space-y-3 pb-10 pt-3 text-white">
      {/* Editorial description */}
      {personality && (
        <section className="weather-panel p-5">
          <h2 className="font-display mb-3 text-xl font-semibold text-white">About this beach</h2>
          <p className="leading-relaxed text-white/75">{personality.editorial}</p>
        </section>
      )}

      {/* What makes it special */}
      {personality && personality.differentiators.length > 0 && (
        <section className="weather-panel p-5">
          <h2 className="font-display mb-3 text-xl font-semibold text-white">
            What makes it special
          </h2>
          <ul className="space-y-2">
            {personality.differentiators.map((item) => (
              <li key={item} className="flex items-start gap-2 text-white/75">
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

      {/* Similar vibes */}
      <SimilarVibes currentBeachId={beach.id} />

      {/* Amenities grouped by use case */}
      {amenities && (hasFamilyAmenities || hasDogAmenities || hasSportsAmenities) && (
        <section className="weather-panel space-y-5 p-5">
          {hasFamilyAmenities && (
            <div>
              <h3 className="font-display mb-2 text-lg font-semibold text-white">For families</h3>
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
              <h3 className="font-display mb-2 text-lg font-semibold text-white">For dogs</h3>
              <AmenityChip icon={<Dog className="w-4 h-4" />} label="Dog friendly" />
            </div>
          )}

          {hasSportsAmenities && (
            <div>
              <h3 className="font-display mb-2 text-lg font-semibold text-white">For sports</h3>
              <AmenityChip
                icon={<Volleyball className="w-4 h-4" />}
                label={`${amenities.volleyballCourts} volleyball court${amenities.volleyballCourts !== 1 ? 's' : ''}`}
              />
            </div>
          )}
        </section>
      )}

      {/* Getting there */}
      <section className="weather-panel p-5">
        <h2 className="font-display mb-3 text-xl font-semibold text-white">Getting there</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-white/75">
            <Navigation className="w-5 h-5 text-ocean-500 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              {beach.name}, Vancouver, BC
              {amenities?.parking && amenities.parking !== 'none' && (
                <span className="mt-0.5 block text-sm text-white/55">
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
    <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-sm text-white/80">
      {icon}
      {label}
    </span>
  );
}

function SimilarVibes({ currentBeachId }: { currentBeachId: string }) {
  const currentPersonality = getPersonality(currentBeachId);
  if (!currentPersonality) return null;

  const similar = beachPersonalities
    .filter((p) => p.slug !== currentBeachId)
    .map((p) => ({
      ...p,
      sharedVibes: p.vibes.filter((v) => currentPersonality.vibes.includes(v)),
    }))
    .filter((p) => p.sharedVibes.length > 0)
    .sort((a, b) => b.sharedVibes.length - a.sharedVibes.length)
    .slice(0, 3);

  if (similar.length === 0) return null;

  return (
    <section className="weather-panel p-5">
      <h2 className="font-display mb-3 text-xl font-semibold text-white">Similar vibes</h2>
      <div className="space-y-2">
        {similar.map((beach) => {
          const beachData = BEACHES.find((b) => b.id === beach.slug);
          return (
            <a
              key={beach.slug}
              href={`/beach/${beach.slug}`}
              data-testid="similar-vibe-link"
              className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 transition-colors hover:bg-white/15"
            >
              <span className="font-medium text-white">{beachData?.name ?? beach.slug}</span>
              <div className="flex gap-1">
                {beach.sharedVibes.map((v) => (
                  <span
                    key={v}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
