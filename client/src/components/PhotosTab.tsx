import type { Beach } from '@van-beaches/shared';
import { getPersonality } from '../data/beach-personalities';
import { InstagramEmbed } from './InstagramEmbed';

interface PhotosTabProps {
  beach: Beach;
}

export function PhotosTab({ beach }: PhotosTabProps) {
  const personality = getPersonality(beach.id);

  // Use beach name as fallback hashtag when personality is missing
  const hashtag = personality?.instagramHashtag ?? beach.name.toLowerCase().replace(/\s+/g, '');

  return (
    <section className="weather-panel mt-3 space-y-6 p-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Community photos</h2>
        <p className="mt-1 text-sm text-white/60">
          from <span className="font-semibold text-white/80">#{hashtag}</span>
        </p>
      </div>

      <InstagramEmbed postUrls={personality?.instagramPostUrls ?? []} hashtag={hashtag} />

      <div className="pt-4">
        <p className="text-sm text-white/70">
          Share your visit! Tag <span className="font-semibold text-white">#{hashtag}</span> on
          Instagram to appear here
        </p>
      </div>
    </section>
  );
}
