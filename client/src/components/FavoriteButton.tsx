import { Heart } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import { cn } from '../lib/utils';

interface FavoriteButtonProps {
  beachId: string;
  beachName?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function FavoriteButton({ beachId, beachName }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = isFavorite(beachId);
  const label = isFav
    ? `Remove ${beachName || 'beach'} from favorites`
    : `Add ${beachName || 'beach'} to favorites`;

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleFavorite(beachId);
      }}
      className={cn('header-control', isFav && 'header-control-selected')}
      aria-label={label}
      aria-pressed={isFav}
      title={label}
    >
      <Heart
        className={cn('h-[18px] w-[18px]', isFav && 'fill-current')}
        strokeWidth={1.7}
        aria-hidden="true"
      />
      <span className="hidden sm:inline">{isFav ? 'Saved' : 'Save'}</span>
    </button>
  );
}
