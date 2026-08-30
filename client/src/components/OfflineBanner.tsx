import { AnimatePresence, motion } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useOffline } from '../hooks/useOffline';
import { Icon } from './ui';

export function OfflineBanner() {
  const isOffline = useOffline();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="overflow-hidden"
        >
          <div className="bg-sand-700 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm">
            <Icon icon={WifiOff} size="sm" />
            <span>You're offline — some live conditions may be unavailable</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
