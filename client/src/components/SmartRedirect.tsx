import { Navigate } from 'react-router-dom';
import { useFavorites } from '../hooks/useFavorites';

/**
 * Smart routing component that directs users based on their favorites:
 * - New users (no favorites) → Discovery page
 * - Returning users (has favorites) → Their primary favorite beach
 */
export function SmartRedirect() {
  const { favorites } = useFavorites();

  if (favorites.length > 0) {
    // User has favorites - redirect to primary favorite beach
    return <Navigate to={`/beach/${favorites[0]}`} replace />;
  }

  // New user - show discovery homepage
  return <Navigate to="/discover" replace />;
}
