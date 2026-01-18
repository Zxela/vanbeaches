import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';
import { Icon } from './ui';

interface FavoriteButtonProps {
  beachId: string;
  beachName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({ beachId, beachName, size = 'md' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(beachId);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'sm' as const,
    md: 'md' as const,
    lg: 'lg' as const,
  };

  const label = isFav
    ? `Remove ${beachName || 'beach'} from favorites`
    : `Add ${beachName || 'beach'} to favorites`;

  return (
    <motion.button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(beachId);
      }}
      className={cn(
        sizeClasses[size],
        'rounded-full flex items-center justify-center transition-colors',
        isFav
          ? 'bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-800/50'
          : 'bg-sand-100 dark:bg-sand-700 hover:bg-sand-200 dark:hover:bg-sand-600',
      )}
      aria-label={label}
      aria-pressed={isFav}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Icon
        icon={Star}
        size={iconSizes[size]}
        className={cn(
          'transition-colors',
          isFav ? 'text-amber-500 fill-amber-500' : 'text-sand-400 dark:text-sand-500',
        )}
      />
    </motion.button>
  );
}
