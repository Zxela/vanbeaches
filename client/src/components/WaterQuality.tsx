import type { WaterQualityStatus } from '@van-beaches/shared';

interface WaterQualityProps {
  status: WaterQualityStatus | null;
  loading?: boolean;
  error?: string | null;
}

const colors: Record<string, string> = {
  good: 'bg-green-100 text-green-800',
  advisory: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-red-100 text-red-800',
  unknown: 'bg-gray-100 text-gray-800',
  'off-season': 'bg-blue-100 text-blue-800',
};

export function WaterQuality({ status, loading, error }: WaterQualityProps) {
  if (loading) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Water Quality</h3><div className="animate-pulse h-16 bg-gray-200 rounded" /></div>;
  if (error) return <div className="bg-white rounded-lg shadow p-4"><h3 className="text-lg font-semibold mb-3">Water Quality</h3><p className="text-red-500">{error}</p></div>;
  if (!status) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-semibold mb-3">Water Quality</h3>
      <span className={'inline-block px-3 py-1 rounded-full text-sm font-medium ' + (colors[status.level] || colors.unknown)}>
        {status.level === 'off-season' ? 'Off-Season' : status.level.charAt(0).toUpperCase() + status.level.slice(1)}
      </span>
      {status.level === 'off-season' && <p className="mt-2 text-gray-600 text-sm">Monitoring resumes in May</p>}
      {status.advisoryReason && <p className="mt-2 text-yellow-700 text-sm">{status.advisoryReason}</p>}
      {status.sampleDate && <p className="mt-2 text-gray-500 text-xs">Last sampled: {new Date(status.sampleDate).toLocaleDateString()}</p>}
    </div>
  );
}
