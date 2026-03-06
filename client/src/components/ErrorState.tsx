interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white dark:bg-sand-800 dark:border-sand-700 p-6 text-center">
      <p className="text-sand-600 dark:text-sand-400 mb-3">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-medium text-ocean-600 hover:text-ocean-700 dark:text-ocean-400 dark:hover:text-ocean-300"
        >
          Try again
        </button>
      )}
    </div>
  );
}
