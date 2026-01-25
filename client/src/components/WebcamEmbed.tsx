import { EyeOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface WebcamEmbedProps {
  url: string;
  beachName: string;
  onHide: () => void;
}

export function WebcamEmbed({ url, beachName, onHide }: WebcamEmbedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Detect touch device for always-visible hide button
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check for touch capability
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

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

  const showHideButton = isHovered || isTouchDevice;

  return (
    <div
      ref={ref}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isVisible && !isLoaded && (
        <div className="animate-pulse bg-ocean-100 dark:bg-sand-700 aspect-video" />
      )}
      {isVisible && (
        <img
          src={url}
          alt={beachName}
          className={`w-full aspect-video object-cover ${isLoaded ? '' : 'absolute opacity-0'}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      )}
      {isLoaded && (
        <button
          type="button"
          onClick={onHide}
          className={`absolute top-3 right-12 bg-black/50 hover:bg-black/70 text-white p-2 rounded-lg flex items-center gap-1.5 transition-opacity duration-150 ${
            showHideButton ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Hide webcam"
        >
          <EyeOff className="w-4 h-4" />
          <span className="text-sm">Hide</span>
        </button>
      )}
    </div>
  );
}
