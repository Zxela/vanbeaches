interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  variant?: 'app' | 'weather';
}

export function ErrorState({ message, onRetry, variant = 'app' }: ErrorStateProps) {
  const isWeather = variant === 'weather';
  return (
    <div className={`${isWeather ? 'weather-panel' : 'app-surface'} rounded-2xl p-6 text-center`}>
      <p className={`mb-3 ${isWeather ? 'text-white/75' : 'text-slate-700 dark:text-slate-200'}`}>
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors ${isWeather ? 'bg-white/10 hover:bg-white/15' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          Try again
        </button>
      )}
    </div>
  );
}
