import type { WaterQualityStatus } from '@van-beaches/shared';

interface WaterQualityProps {
  status: WaterQualityStatus | null;
  loading?: boolean;
  error?: string | null;
}

const colors: Record<string, string> = {
  good: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  advisory: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  closed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
  'off-season': 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
};

const icons: Record<string, string> = {
  good: '✓',
  advisory: '⚠',
  closed: '✕',
  unknown: '?',
  'off-season': '❄',
};

export function WaterQuality({ status, loading, error }: WaterQualityProps) {
  if (loading)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Water Quality</h3>
        <div className="animate-pulse h-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    );
  if (error)
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Water Quality</h3>
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    );
  if (!status) return null;

  const label =
    status.level === 'off-season'
      ? 'Off-Season'
      : status.level.charAt(0).toUpperCase() + status.level.slice(1);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Water Quality</h3>
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${colors[status.level] || colors.unknown}`}
      >
        <span>{icons[status.level] || '?'}</span>
        <span>{label}</span>
      </div>
      {status.level === 'good' && (
        <p className="mt-3 text-green-700 dark:text-green-400 text-sm">Safe for swimming</p>
      )}
      {status.level === 'off-season' && (
        <p className="mt-3 text-gray-600 dark:text-gray-400 text-sm">Monitoring resumes in May</p>
      )}
      {status.advisoryReason && (
        <div className="mt-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
          <p className="text-yellow-800 dark:text-yellow-300 text-sm">{status.advisoryReason}</p>
        </div>
      )}
      {status.sampleDate && (
        <p className="mt-3 text-gray-500 dark:text-gray-400 text-xs">
          Last sampled: {new Date(status.sampleDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
