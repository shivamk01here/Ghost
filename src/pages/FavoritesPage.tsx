import { Heart } from 'lucide-react';
import { useFavorites } from '../hooks/useDatabase';
import { EntryCard } from '../components/EntryCard';

export const FavoritesPage: React.FC = () => {
  const { favorites, isLoading } = useFavorites();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
              <div className="flex-1 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <Heart className="text-red-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          No favorites yet
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Mark your favorite entries by clicking the heart icon. They'll appear here for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Heart className="text-red-500 fill-red-500" size={24} />
          Favorites
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {favorites.length} {favorites.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div className="space-y-4">
        {favorites.map((entry) => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
};
