import { useParams } from 'react-router-dom';
import { Tag } from 'lucide-react';
import { useEntries } from '../hooks/useDatabase';
import { EntryCard } from '../components/EntryCard';

export const TagFilterPage: React.FC = () => {
  const { tag } = useParams<{ tag: string }>();
  const { entries } = useEntries();

  const filteredEntries = tag
    ? entries.filter((entry) => entry.tags.includes(tag))
    : [];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <Tag className="text-primary-500" size={20} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            #{tag}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredEntries.length} {filteredEntries.length === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No entries found with this tag
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <EntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </div>
  );
};
