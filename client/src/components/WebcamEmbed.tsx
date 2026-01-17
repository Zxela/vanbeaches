import { useState, useRef, useEffect } from 'react';

interface WebcamEmbedProps { url: string | null; beachName: string; }

export function WebcamEmbed({ url, beachName }: WebcamEmbedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setIsVisible(true); }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  if (!url) return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Webcam</h3>
      <div className="bg-gray-200 rounded h-48 flex items-center justify-center text-gray-500">Webcam unavailable for {beachName}</div>
    </div>
  );

  return (
    <div ref={ref} className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Live Webcam</h3>
      {!isLoaded && <div className="animate-pulse bg-gray-200 rounded h-48" />}
      {isVisible && (
        <iframe
          src={url}
          className={'w-full h-48 rounded ' + (isLoaded ? '' : 'hidden')}
          onLoad={() => setIsLoaded(true)}
          sandbox="allow-scripts allow-same-origin"
          title={beachName + ' webcam'}
        />
      )}
    </div>
  );
}
