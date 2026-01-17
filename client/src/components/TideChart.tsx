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
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">Tides</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 bg-ocean-100 dark:bg-sand-700 rounded" />
          ))}
        </div>
      </div>
    );
  if (error)
    return (
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">Tides</h3>
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  if (predictions.length === 0)
    return (
      <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
        <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">Tides</h3>
        <p className="text-sand-500 dark:text-sand-400">Tide information not applicable</p>
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
    <div className="bg-gradient-to-br from-ocean-50 to-sky-50 dark:from-sand-800 dark:to-sand-800 rounded-xl shadow-lg p-4 border border-ocean-100 dark:border-sand-700">
      <h3 className="text-lg font-semibold text-sand-900 dark:text-sand-100 mb-3">
        Upcoming Tides
      </h3>
      <div className="space-y-4">
        {Object.entries(groupedTides).map(([date, tides]) => (
          <div key={date}>
            <p className="text-sm font-medium text-sand-500 dark:text-sand-400 mb-2">{date}</p>
            <div className="space-y-2">
              {tides.map((tide) => (
                <div
                  key={tide.time}
                  className={`flex justify-between items-center p-3 rounded-lg ${tide.type === 'high' ? 'bg-shore-50 dark:bg-shore-900/20' : 'bg-ocean-50 dark:bg-ocean-900/20'}`}
                >
                  <span
                    className={
                      tide.type === 'high'
                        ? 'text-shore-600 dark:text-shore-400 font-medium'
                        : 'text-ocean-600 dark:text-ocean-400'
                    }
                  >
                    {tide.type === 'high' ? '▲ High' : '▼ Low'}
                  </span>
                  <span className="text-sand-700 dark:text-sand-300">{formatTime(tide.time)}</span>
                  <span className="font-mono text-sand-900 dark:text-sand-50">
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
