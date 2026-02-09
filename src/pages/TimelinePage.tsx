import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Book, FileText, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { SearchBar } from '../components/SearchBar';
import { ImageModal } from '../components/ImageModal';
import { useSearch } from '../hooks/useDatabase';
import type { SearchFilters } from '../types';

export const TimelinePage: React.FC = () => {
  const navigate = useNavigate();
  const [filters] = useState<SearchFilters>({
    query: '',
    tags: [],
    favoritesOnly: false
  });
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const { results: entries, isLoading } = useSearch(filters);
  const hasActiveFilters = filters.query || filters.tags.length > 0 || filters.favoritesOnly;

  // Extract available months from entries
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    entries.forEach(entry => {
      if (entry.createdAt) {
        months.add(format(new Date(entry.createdAt), 'MMMM yyyy'));
      }
    });
    return Array.from(months);
  }, [entries]);

  // Filter entries by month
  const filteredEntries = useMemo(() => {
    if (selectedMonth === 'All') return entries;
    return entries.filter(entry => 
      entry.createdAt && format(new Date(entry.createdAt), 'MMMM yyyy') === selectedMonth
    );
  }, [entries, selectedMonth]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1 tracking-tight">
            Timeline
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your journey, condensed.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Month Filter Dropdown */}
          <div className="relative group min-w-[140px]">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 py-2.5 pl-4 pr-10 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <option value="All">All Months</option>
              {availableMonths.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          <div className="w-full md:w-72">
            <SearchBar />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8 pl-24">
           {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-6 animate-pulse">
               <div className="flex-1 h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
            </div>
           ))}
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-300 dark:text-gray-600">
             <ImageIcon size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
             {hasActiveFilters || selectedMonth !== 'All' ? 'No matches found' : 'Your timeline is empty'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
            {hasActiveFilters || selectedMonth !== 'All'
              ? 'Try adjusting your filters.'
              : 'Start writing your story today.'}
          </p>
          {!hasActiveFilters && selectedMonth === 'All' && (
            <button
              onClick={() => navigate('/editor/new')}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95"
            >
              Create Entry
            </button>
          )}
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical Line */}
          <div className="absolute left-[5.5rem] top-2 bottom-0 w-px bg-gray-200 dark:bg-gray-800 hidden md:block" />

          {filteredEntries.map((entry, index) => {
            const date = new Date(entry.createdAt);
            const contentSnippet = entry.content.replace(/<[^>]*>/g, '').substring(0, 100) + '...';
            const hasImage = entry.heroImage || (entry.images && entry.images.length > 0);
            const imageSrc = entry.heroImage || entry.images?.[0];

            return (
              <div 
                key={entry.id} 
                className="group relative flex flex-col md:flex-row gap-6 pb-6 last:pb-0"
              >
                {/* Date Column */}
                <div className="md:w-20 md:text-right pt-1 flex-shrink-0 flex flex-row md:flex-col items-center md:items-end gap-3 md:gap-0">
                   <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                     {format(date, 'EEE')}
                   </span>
                   <span className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none mb-0.5">
                     {format(date, 'd')}
                   </span>
                   <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500">
                     {format(date, 'MMM')}
                   </span>
                </div>

                {/* Timeline Dot */}
                <div className="absolute left-[5.5rem] mt-2.5 hidden md:flex items-center justify-center transform -translate-x-1/2 z-10">
                   <div className={`w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 transition-all duration-300 ${
                     index === 0 ? 'bg-primary-500 scale-110 shadow-md shadow-primary-500/30' : 'bg-gray-300 dark:bg-gray-700 group-hover:bg-primary-400'
                   }`} />
                </div>

                {/* Content Card */}
                <div 
                  onClick={() => navigate(`/editor/${entry.id}`)}
                  className="flex-1 cursor-pointer"
                >
                  <div className="bg-transparent md:hover:bg-gray-50 md:dark:hover:bg-gray-800/50 -m-4 p-4 rounded-2xl transition-all duration-200 flex flex-col-reverse md:flex-row gap-4 md:items-start group-hover:scale-[1.005]">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight group-hover:text-primary-500 transition-colors">
                          {entry.title || 'Untitled'}
                        </h3>
                        <span className="text-[10px] text-gray-400 font-medium md:hidden">
                           {format(date, 'h:mm a')}
                        </span>
                      </div>
                      
                      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {contentSnippet}
                      </p>
                      
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {entry.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[9px] font-bold uppercase tracking-wider rounded-md">
                              #{tag}
                            </span>
                          ))}
                          {entry.tags.length > 3 && (
                            <span className="text-[9px] text-gray-400 self-center">+{entry.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Thumbnail or Icon Placeholder */}
                    <div className="w-full md:w-20 h-32 md:h-20 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-gray-50 dark:bg-gray-800 relative group-hover:shadow-md transition-all border border-gray-100 dark:border-gray-800">
                      {hasImage ? (
                        <img 
                          src={imageSrc} 
                          alt="" 
                          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 cursor-zoom-in"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(imageSrc!);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-700">
                          {entry.title.length % 2 === 0 ? <Book size={20} /> : <FileText size={20} />}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <ImageModal 
        src={selectedImage || ''}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};
