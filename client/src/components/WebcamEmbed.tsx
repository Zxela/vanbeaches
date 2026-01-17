import { useEffect, useRef, useState } from 'react';

interface WebcamEmbedProps {
  url: string | null;
  beachName: string;
  photoUrl?: string;
  photoCredit?: string;
  photoCreditUrl?: string;
}

export function WebcamEmbed({
  url,
  beachName,
  photoUrl,
  photoCredit,
  photoCreditUrl,
}: WebcamEmbedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Use photo if available, otherwise fall back to webcam URL
  const displayUrl = photoUrl || url;

  if (!displayUrl)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
        <div className="aspect-video bg-gradient-to-br from-blue-100 to-cyan-50 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
          <div className="text-center">
            <span className="text-4xl block mb-2">🏖️</span>
            <span>Photo coming soon</span>
          </div>
        </div>
      </div>
    );

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden relative"
    >
      {isVisible && !isLoaded && (
        <div className="animate-pulse bg-ocean-100 dark:bg-sand-700 aspect-video" />
      )}
      {isVisible && (
        <img
          src={displayUrl}
          alt={beachName}
          className={`w-full aspect-video object-cover ${isLoaded ? '' : 'absolute opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      )}
      {photoCredit && isLoaded && (
        <a
          href={photoCreditUrl || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white/90 text-xs px-2.5 py-1.5 rounded-md hover:bg-black/80 transition-colors flex items-center gap-1.5"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          {photoCredit}
        </a>
      )}
    </div>
  );
}
