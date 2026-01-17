import type { TidePrediction } from '@van-beaches/shared';

interface TideChartProps {
  predictions: TidePrediction[];
  loading?: boolean;
  error?: string | null;
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'America/Vancouver' });
}

export function TideChart({ predictions, loading, error }: TideChartProps) {
  if (loading) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Tides</h3><div className="animate-pulse space-y-2">{[1,2,3,4,5,6].map(i => <div key={i} className="h-8 bg-gray-200 rounded" />)}</div></div>;
  if (error) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Tides</h3><p className="text-red-500">{error}</p></div>;
  if (predictions.length === 0) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Tides</h3><p className="text-gray-500">Tide information not applicable</p></div>;
  
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Upcoming Tides</h3>
      <div className="space-y-2">
        {predictions.map((tide, idx) => (
          <div key={idx} className={'flex justify-between items-center p-2 rounded ' + (tide.type === 'high' ? 'bg-blue-50' : 'bg-gray-50')}>
            <span className={tide.type === 'high' ? 'text-blue-600' : 'text-gray-600'}>{tide.type === 'high' ? '▲ High' : '▼ Low'}</span>
            <span className="text-gray-700">{formatTime(tide.time)}</span>
            <span className="font-mono">{tide.height.toFixed(2)} m</span>
          </div>
        ))}
      </div>
    </div>
  );
}
