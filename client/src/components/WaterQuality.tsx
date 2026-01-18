import type { WaterQualityStatus } from '@van-beaches/shared';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle, Droplets, HelpCircle, Snowflake, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardTitle, Icon } from './ui';

interface WaterQualityProps {
  status: WaterQualityStatus | null;
  loading?: boolean;
  error?: string | null;
}

interface StatusConfig {
  icon: LucideIcon;
  bgColor: string;
  textColor: string;
  iconColor: string;
  label: string;
}

const statusConfig: Record<string, StatusConfig> = {
  good: {
    icon: CheckCircle,
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    textColor: 'text-emerald-800 dark:text-emerald-300',
    iconColor: 'text-emerald-500',
    label: 'Good',
  },
  advisory: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-800 dark:text-amber-300',
    iconColor: 'text-amber-500',
    label: 'Advisory',
  },
  closed: {
    icon: XCircle,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-800 dark:text-red-300',
    iconColor: 'text-red-500',
    label: 'Closed',
  },
  unknown: {
    icon: HelpCircle,
    bgColor: 'bg-sand-100 dark:bg-sand-700',
    textColor: 'text-sand-800 dark:text-sand-300',
    iconColor: 'text-sand-500',
    label: 'Unknown',
  },
  'off-season': {
    icon: Snowflake,
    bgColor: 'bg-sky-100 dark:bg-sky-900/30',
    textColor: 'text-sky-800 dark:text-sky-300',
    iconColor: 'text-sky-500',
    label: 'Off-Season',
  },
};

export function WaterQuality({ status, loading, error }: WaterQualityProps) {
  if (loading) {
    return (
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Droplets} size="lg" color="ocean" />
          Water Quality
        </CardTitle>
        <CardContent className="mt-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 shimmer rounded-full" />
            <div className="space-y-2">
              <div className="w-20 h-5 shimmer rounded" />
              <div className="w-32 h-4 shimmer rounded" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardTitle className="flex items-center gap-2">
          <Icon icon={Droplets} size="lg" color="ocean" />
          Water Quality
        </CardTitle>
        <CardContent className="mt-4">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  const config = statusConfig[status.level] || statusConfig.unknown;
  const StatusIcon = config.icon;

  return (
    <Card animated>
      <CardTitle className="flex items-center gap-2">
        <Icon icon={Droplets} size="lg" color="ocean" />
        Water Quality
      </CardTitle>

      <CardContent className="mt-4">
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div
            className={`w-12 h-12 rounded-full ${config.bgColor} flex items-center justify-center`}
          >
            <StatusIcon className={`w-6 h-6 ${config.iconColor}`} />
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-semibold ${config.bgColor} ${config.textColor}`}
            >
              {config.label}
            </span>
            {status.level === 'good' && (
              <p className="mt-1 text-emerald-600 dark:text-emerald-400 text-sm">
                Safe for swimming
              </p>
            )}
            {status.level === 'off-season' && (
              <p className="mt-1 text-sand-500 dark:text-sand-400 text-sm">
                Monitoring resumes in May
              </p>
            )}
          </div>
        </motion.div>

        {status.advisoryReason && (
          <motion.div
            className="mt-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200/50 dark:border-amber-800/50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-amber-800 dark:text-amber-300 text-sm">{status.advisoryReason}</p>
            </div>
          </motion.div>
        )}

        {status.sampleDate && (
          <motion.p
            className="mt-3 text-sand-500 dark:text-sand-400 text-xs"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Last sampled: {new Date(status.sampleDate).toLocaleDateString()}
          </motion.p>
        )}
      </CardContent>
    </Card>
  );
}
