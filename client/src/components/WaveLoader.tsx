interface WaveLoaderProps {
  text?: string;
}

export function WaveLoader({ text = 'Loading...' }: WaveLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative w-24 h-12 overflow-hidden">
        <div className="absolute inset-0 flex items-end">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="flex-1 bg-gradient-to-t from-ocean-500 to-ocean-300 rounded-t-full mx-0.5 animate-wave"
              style={{
                height: '60%',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>
      </div>
      <p className="mt-4 text-sand-500 dark:text-sand-400 text-sm">{text}</p>
    </div>
  );
}
