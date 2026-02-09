import { useState } from 'react';
import { Search, X, Heart, Filter, Tag } from 'lucide-react';
import { useDebounce } from '../hooks/useUI';
import { useSearch, useTags } from '../hooks/useDatabase';
import type { SearchFilters } from '../types';

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const debouncedQuery = useDebounce(query, 300);
  const { tags } = useTags();
  
  const filters: SearchFilters = {
    query: debouncedQuery,
    tags: selectedTags,
    favoritesOnly
  };
  
  const { results, isLoading } = useSearch(filters);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setQuery('');
    setSelectedTags([]);
    setFavoritesOnly(false);
  };

  const hasActiveFilters = query || selectedTags.length > 0 || favoritesOnly;

  return (
    <div className="mb-6">
      <div className="flex gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries..."
            className="input-field pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2 rounded-lg border transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-primary-500 text-primary-500 bg-primary-50 dark:bg-primary-900/20'
              : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          title="Toggle filters"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          {/* Favorites Toggle */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setFavoritesOnly(!favoritesOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors ${
                favoritesOnly
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Heart size={14} className={favoritesOnly ? 'fill-current' : ''} />
              <span>Favorites only</span>
            </button>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-600 dark:text-gray-400">
                <Tag size={14} />
                <span>Filter by tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-primary-500 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="mt-4 text-sm text-primary-500 hover:text-primary-600"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      {hasActiveFilters && (
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {isLoading ? (
            'Searching...'
          ) : (
            <>
              Found <span className="font-medium text-gray-900 dark:text-white">{results.length}</span> {results.length === 1 ? 'entry' : 'entries'}
            </>
          )}
        </div>
      )}
    </div>
  );
};
