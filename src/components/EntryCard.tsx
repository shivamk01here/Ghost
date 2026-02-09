import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Heart, MapPin } from 'lucide-react';
import type { JournalEntry } from '../types';

interface EntryCardProps {
  entry: JournalEntry;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry }) => {
  const navigate = useNavigate();
  const date = parseISO(entry.date);
  const dayOfMonth = format(date, 'd');
  const dayOfWeek = format(date, 'EEE');

  // Strip HTML tags for preview
  const stripHtml = (html: string): string => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  };

  const textPreview = stripHtml(entry.content).slice(0, 100);
  const hasMore = stripHtml(entry.content).length > 100;

  return (
    <div
      onClick={() => navigate(`/editor/${entry.id}`)}
      className="card overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
    >
      {/* Hero Image */}
      {entry.heroImage && (
        <div className="relative w-full h-32 overflow-hidden">
          <img
            src={entry.heroImage}
            alt={entry.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {entry.isFavorite && (
            <div className="absolute top-2 right-2 p-1 bg-white/90 dark:bg-black/70 rounded-full">
              <Heart size={14} className="text-red-500 fill-red-500" />
            </div>
          )}
        </div>
      )}

      <div className="p-3">
        <div className="flex gap-3">
          {/* Date Column */}
          <div className="flex-shrink-0 w-12 text-center">
            <div className="text-xl font-bold text-gray-900 dark:text-white leading-none">
              {dayOfMonth}
            </div>
            <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase mt-0.5">
              {dayOfWeek}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                {!entry.heroImage && entry.isFavorite && (
                  <Heart size={12} className="text-red-500 fill-red-500" />
                )}
                {entry.location && (
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <MapPin size={10} />
                    {entry.location}
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            {entry.title && entry.title !== 'Untitled Entry' && (
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
                {entry.title}
              </h3>
            )}

            <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-2 mb-2">
              {textPreview}
              {hasMore && (
                <span className="text-primary-500 ml-1">...</span>
              )}
            </p>

            {/* Tags */}
            {entry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
                {entry.tags.length > 3 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    +{entry.tags.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Thumbnail (only show if no hero image) */}
            {!entry.heroImage && entry.images.length > 0 && (
              <div className="flex gap-1.5 mt-2">
                <div className="relative w-16 h-16 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img
                    src={entry.images[0]}
                    alt="Entry thumbnail"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                {entry.images.length > 1 && (
                  <div className="w-16 h-16 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                    +{entry.images.length - 1}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
