interface InstagramEmbedProps {
  postUrls: string[];
  hashtag: string;
  fallbackImages?: string[];
  loading?: boolean;
}

function InstagramIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

export function InstagramEmbed({
  postUrls,
  hashtag,
  fallbackImages,
  loading = false,
}: InstagramEmbedProps) {
  const hasPosts = Array.isArray(postUrls) && postUrls.length > 0;
  const hasFallbacks =
    Array.isArray(fallbackImages) && fallbackImages.length > 0;

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-sand-100 rounded-xl aspect-square"
          />
        ))}
      </div>
    );
  }

  if (hasPosts) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {postUrls.map((url) => (
          <a
            key={url}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 rounded-xl bg-sand-50 border border-sand-200 p-4 text-coral-600 hover:bg-sand-100 transition-colors aspect-square"
            aria-label="View on Instagram"
          >
            <InstagramIcon />
            <span className="text-xs font-medium text-sand-700">
              View on Instagram
            </span>
          </a>
        ))}
      </div>
    );
  }

  if (hasFallbacks) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {fallbackImages!.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`Instagram post ${i + 1}`}
            className="rounded-xl object-cover aspect-square w-full"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-sand-50 border border-sand-200 p-6 text-center text-sand-600">
      <p className="text-sm">
        Share your photos on Instagram with{' '}
        <span className="font-semibold text-coral-500">#{hashtag}</span>
      </p>
    </div>
  );
}
