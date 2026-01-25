import { Video } from 'lucide-react';
import { cn } from '../lib/utils';

interface WebcamPlaceholderProps {
  onShow: () => void;
  className?: string;
}

/**
 * A minimal placeholder bar that appears when the user has hidden the webcam.
 * Clicking it restores the webcam view.
 */
export function WebcamPlaceholder({ onShow, className }: WebcamPlaceholderProps) {
  return (
    <button
      type="button"
      onClick={onShow}
      className={cn(
        'h-10 w-full rounded-xl',
        'bg-sand-100 dark:bg-sand-800',
        'text-sand-500 dark:text-sand-400',
        'hover:bg-sand-200 dark:hover:bg-sand-700',
        'flex items-center justify-center gap-2',
        'cursor-pointer',
        'transition-colors duration-200',
        className,
      )}
      aria-label="Show webcam"
    >
      <Video className="w-4 h-4" aria-hidden="true" />
      <span className="text-sm font-medium">Show webcam</span>
    </button>
  );
}
