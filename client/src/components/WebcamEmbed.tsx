import { EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WebcamEmbedProps {
  url: string;
  beachName: string;
  onHide: () => void;
}

export function WebcamEmbed({ url, beachName, onHide }: WebcamEmbedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);
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

  return (
    <div ref={ref} className="weather-panel relative overflow-hidden">
      {(!isVisible || status === 'loading') && (
        <output className="block aspect-video animate-pulse p-5">Loading webcam…</output>
      )}
      {isVisible && status !== 'error' && (
        <img
          key={`${url}-${attempt}`}
          src={url}
          alt={beachName}
          className={`aspect-video w-full object-cover ${status === 'loaded' ? '' : 'absolute opacity-0'}`}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      )}
      {status === 'error' && (
        <div className="space-y-3 p-5">
          <p role="alert">Webcam unavailable</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-lg bg-blue-700 px-4 text-white"
              onClick={() => {
                setStatus('loading');
                setAttempt((value) => value + 1);
              }}
            >
              Retry
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center underline"
            >
              Open source
            </a>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onHide}
        aria-label="Hide webcam"
        className="flex items-center gap-2 px-4 py-2 text-white"
      >
        <EyeOff className="h-4 w-4" /> Hide
      </button>
    </div>
  );
}
