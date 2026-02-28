import { Navigate } from 'react-router-dom';

export function SmartRedirect() {
  return <Navigate to="/discover" replace />;
}
