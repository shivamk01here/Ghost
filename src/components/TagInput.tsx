import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { db } from '../db';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
];

const getTagColor = (tag: string) => {
  // Simple hash to get consistent color for each tag
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add tags...'
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch all existing tags for suggestions
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const entries = await db.entries.toArray();
        const allTags = new Set<string>();
        entries.forEach(entry => {
          (entry.tags || []).forEach(tag => allTags.add(tag));
        });
        const filtered = Array.from(allTags)
          .filter(tag => 
            tag.toLowerCase().includes(inputValue.toLowerCase()) &&
            !tags.includes(tag)
          )
          .slice(0, 5);
        setSuggestions(filtered);
      } catch (err) {
        console.error('Failed to fetch tags:', err);
      }
    };

    if (inputValue) {
      fetchTags();
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [inputValue, tags]);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0 && showSuggestions) {
        addTag(suggestions[selectedIndex]);
      } else if (inputValue) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp' && showSuggestions) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 focus-within:border-primary-500/50 transition-colors">
        {/* Existing Tags */}
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${getTagColor(tag)}`}
          >
            <TagIcon size={10} />
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="ml-0.5 p-0.5 hover:bg-black/10 dark:hover:bg-white/10 rounded transition-colors"
            >
              <X size={10} />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-xs text-gray-700 dark:text-gray-300 placeholder:text-gray-400"
        />
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => addTag(suggestion)}
              className={`w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 transition-colors ${
                index === selectedIndex
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <TagIcon size={12} className="text-gray-400" />
              {suggestion}
            </button>
          ))}
          
          {/* Create new tag option */}
          {inputValue && !suggestions.includes(inputValue.toLowerCase()) && (
            <button
              onClick={() => addTag(inputValue)}
              className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-t border-gray-100 dark:border-gray-800"
            >
              <Plus size={12} />
              Create "{inputValue}"
            </button>
          )}
        </div>
      )}

      {/* Create new when no suggestions */}
      {showSuggestions && suggestions.length === 0 && inputValue && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50">
          <button
            onClick={() => addTag(inputValue)}
            className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
          >
            <Plus size={12} />
            Create "{inputValue}"
          </button>
        </div>
      )}
    </div>
  );
};
