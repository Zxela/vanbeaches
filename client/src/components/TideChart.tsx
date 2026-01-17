import type { TidePrediction } from '@van-beaches/shared';

interface TideChartProps {
  predictions: TidePrediction[];
  loading?: boolean;
  error?: string | null;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/Vancouver',
  });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function TideChart({ predictions, loading, error }: TideChartProps) {
  if (loading)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tides</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tides</h3>
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  if (predictions.length === 0)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Tides</h3>
        <p className="text-gray-500 dark:text-gray-400">Tide information not applicable</p>
      </div>
    );

  // Group by date
  const groupedTides: Record<string, TidePrediction[]> = {};
  for (const tide of predictions) {
    const date = formatDate(tide.time);
    if (!groupedTides[date]) groupedTides[date] = [];
    groupedTides[date].push(tide);
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Upcoming Tides</h3>
      <div className="space-y-4">
        {Object.entries(groupedTides).map(([date, tides]) => (
          <div key={date}>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{date}</p>
            <div className="space-y-2">
              {tides.map((tide) => (
                <div
                  key={tide.time}
                  className={`flex justify-between items-center p-3 rounded-lg ${tide.type === 'high' ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'bg-gray-50 dark:bg-gray-700/50'}`}
                >
                  <span
                    className={
                      tide.type === 'high'
                        ? 'text-cyan-600 dark:text-cyan-400 font-medium'
                        : 'text-gray-600 dark:text-gray-400'
                    }
                  >
                    {tide.type === 'high' ? '▲ High' : '▼ Low'}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{formatTime(tide.time)}</span>
                  <span className="font-mono text-gray-900 dark:text-white">
                    {tide.height.toFixed(2)} m
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
