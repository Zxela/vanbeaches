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
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-sand-900">Community photos</h2>
        <p className="text-sm text-sand-600 mt-1">
          from <span className="font-semibold text-coral-600">#{hashtag}</span>
        </p>
      </div>

      <InstagramEmbed postUrls={personality?.instagramPostUrls ?? []} hashtag={hashtag} />

      <div className="pt-4">
        <p className="text-sm text-sand-700">
          Share your visit! Tag <span className="font-semibold text-coral-600">#{hashtag}</span> on
          Instagram to appear here
        </p>
      </div>
    </section>
  );
}
