import { useEffect, useState } from 'react';

interface FullscreenWebcamProps {
  url: string | null;
  beachName: string;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
}

export function FullscreenWebcam({ url, beachName }: FullscreenWebcamProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const isImage = url ? isImageUrl(url) : false;

  useEffect(() => {
    if (!isFullscreen || !isImage) return;
    const interval = setInterval(() => setRefreshKey((k) => k + 1), 30000);
    return () => clearInterval(interval);
  }, [isFullscreen, isImage]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    if (isFullscreen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  if (!url) return null;

  const imageUrl = isImage ? `${url}?t=${refreshKey}` : url;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsFullscreen(true)}
        className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg transition-colors z-10"
        title="Fullscreen"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>

      {isFullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div className="absolute top-4 left-4 text-white">
            <h3 className="text-xl font-semibold">{beachName}</h3>
            <p className="text-white/60 text-sm">Live Webcam</p>
          </div>

          {isImage ? (
            <img
              src={imageUrl}
              alt={`${beachName} webcam`}
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <iframe
              src={url}
              className="w-full h-full max-w-[90vw] max-h-[90vh]"
              sandbox="allow-scripts allow-same-origin"
              title={`${beachName} webcam`}
            />
          )}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            Press ESC to exit
          </div>
        </div>
      )}
    </>
  );
}
