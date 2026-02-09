import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Image as ImageIcon, Calendar, Clock, ChevronDown, Lock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { useSearch, useTags } from '../hooks/useDatabase';
import type { SearchFilters } from '../types';

export const SearchPage: React.FC = () => {
  console.log('SearchPage mounting...');
  const navigate = useNavigate();
  const { tags: availableTags } = useTags();
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    tags: [],
    favoritesOnly: false
  });
  const [showImagesOnly, setShowImagesOnly] = useState(false);
  const [showThisMonthOnly, setShowThisMonthOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Combine local state into the search hook filters
  const effectiveFilters = useMemo(() => {
    const f = { ...filters };
    if (showThisMonthOnly) {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
      f.dateFrom = firstDay;
      f.dateTo = lastDay;
    } else {
      f.dateFrom = undefined;
      f.dateTo = undefined;
    }
    return f;
  }, [filters, showThisMonthOnly]);

  const { results, isLoading } = useSearch(effectiveFilters);

  // Post-processing for client-side filters that might be easier here (like images)
  const filteredResults = useMemo(() => {
    let res = [...results];
    
    if (showImagesOnly) {
      res = res.filter(entry => entry.heroImage || (entry.images && entry.images.length > 0));
    }

    if (sortBy === 'newest') {
      res.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      res.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }

    return res;
  }, [results, showImagesOnly, sortBy]);

  const toggleTag = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Search & Discover
        </h1>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
          <Lock size={10} />
          <span>End-to-end Encrypted</span>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="text-gray-400" size={20} />
        </div>
        <input
          type="text"
          value={filters.query}
          onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
          placeholder="Search your thoughts, tags, or places..."
          className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border-2 border-transparent focus:border-primary-500 rounded-2xl text-lg shadow-sm placeholder-gray-400 focus:outline-none transition-all"
        />
        <div className="absolute inset-y-0 right-4 flex items-center">
          <kbd className="hidden sm:inline-flex items-center justify-center h-6 w-6 text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
            /
          </kbd>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Filters</span>
        
        {/* Helper Filters */}
        <button
          onClick={() => setShowImagesOnly(!showImagesOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            showImagesOnly 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <ImageIcon size={14} />
          Photos
        </button>

        <button
          onClick={() => setShowThisMonthOnly(!showThisMonthOnly)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
            showThisMonthOnly 
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25' 
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Calendar size={14} />
          This Month
        </button>

        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />

        {/* Dynamic Tags */}
        {availableTags.slice(0, 5).map(tag => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filters.tags.includes(tag)
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-bold text-gray-900 dark:text-white">{filteredResults.length}</span> entries found
          {filters.query && <span> matching "<span className="text-primary-500">{filters.query}</span>"</span>}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-medium">Sort by:</span>
          <button 
            onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : 'newest')}
            className="text-xs font-bold text-gray-700 dark:text-gray-200 flex items-center gap-1 hover:text-primary-500 transition-colors"
          >
            {sortBy === 'newest' ? 'Newest' : 'Oldest'}
            <ChevronDown size={12} />
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          filteredResults.map(entry => {
            const hasImage = entry.heroImage || (entry.images && entry.images.length > 0);
            const imageSrc = entry.heroImage || entry.images?.[0];
            const contentText = entry.content.replace(/<[^>]*>/g, '');
            // Simple read time estimation: 200 words per minute
            const wordCount = contentText.split(/\s+/).length;
            const readTime = Math.ceil(wordCount / 200);

            return (
              <div 
                key={entry.id}
                onClick={() => navigate(`/editor/${entry.id}`)}
                className="group bg-white dark:bg-gray-900 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/50 rounded-2xl p-4 transition-all duration-300 cursor-pointer flex gap-6"
              >
                {/* Thumbnail */}
                {hasImage && (
                  <div className="w-48 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={imageSrc} 
                      alt="" 
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {/* Meta */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-normal">
                      {format(new Date(entry.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700" />
                    {entry.tags.length > 0 ? (
                       <span className="text-[10px] font-bold text-blue-500 uppercase tracking-normal">
                         {entry.tags[0].toUpperCase()}
                       </span>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-normal">JOURNAL</span>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 leading-tight group-hover:text-primary-500 transition-colors">
                    {entry.title || 'Untitled Entry'}
                  </h3>

                  {/* Snippet */}
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-auto">
                    {contentText || 'No content preview available...'}
                  </p>

                  {/* Footer Meta */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50 dark:border-gray-800">
                    {hasImage && (
                      <div className="flex items-center gap-1.5 text-gray-400">
                        <ImageIcon size={12} />
                        <span className="text-[10px] font-medium">
                          {entry.images.length + (entry.heroImage ? 1 : 0)} photos
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock size={12} />
                      <span className="text-[10px] font-medium">{readTime} min read</span>
                    </div>
                  </div>
                </div>
                
                {/* Desktop Arrow Hint */}
                <div className="hidden sm:flex items-center justify-center w-8 opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 group-hover:text-primary-500">
                  <ArrowRight size={24} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <p className="text-gray-500 font-medium">No results found.</p>
            <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        )}
      </div>
    </div>
  );
};
