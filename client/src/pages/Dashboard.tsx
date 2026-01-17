import { useBeaches } from '../hooks/useBeaches';
import { BeachCard } from '../components/BeachCard';

export function Dashboard() {
  const { beaches, loading, error } = useBeaches();

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Vancouver Beaches</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 9 }).map((_, i) => <div key={i} className="animate-pulse bg-gray-200 h-24 rounded-lg" />)
        ) : (
          beaches.map(beach => <BeachCard key={beach.id} beach={beach} />)
        )}
      </div>
    </div>
  );
}
