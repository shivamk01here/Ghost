import { useState, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';

interface CommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  command: (props: any) => void;
}

interface SlashCommandListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export const SlashCommandList = forwardRef((props: SlashCommandListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    props.items.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [props.items]);

  // Flatten for index navigation
  const flatItems = props.items;

  const selectItem = (index: number) => {
    const item = flatItems[index];
    if (item) {
      props.command(item);
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + flatItems.length - 1) % flatItems.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % flatItems.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  useEffect(() => setSelectedIndex(0), [props.items]);

  // Get flat index for an item
  const getFlatIndex = (item: CommandItem) => flatItems.indexOf(item);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150 w-[320px] max-h-[400px] overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 px-4 py-3 border-b border-gray-50 dark:border-gray-800 z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
          Blocks
        </p>
      </div>

      {/* Grouped Items */}
      <div className="p-2">
        {props.items.length > 0 ? (
          Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="mb-1">
              <div className="px-2 py-1.5">
                <span className="text-[9px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">
                  {category}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                {items.map((item) => {
                  const flatIndex = getFlatIndex(item);
                  const isSelected = flatIndex === selectedIndex;
                  return (
                    <button
                      key={item.title}
                      className={`
                        flex items-center gap-3 w-full px-2 py-2 text-left rounded-xl transition-all duration-100
                        ${isSelected
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' 
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}
                      `}
                      onClick={() => selectItem(flatIndex)}
                      onMouseEnter={() => setSelectedIndex(flatIndex)}
                    >
                      <div className={`
                        p-2 rounded-lg transition-colors
                        ${isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-400'}
                      `}>
                        {item.icon}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold leading-none mb-0.5 truncate">
                          {item.title}
                        </span>
                        <span className={`
                          text-[10px] leading-none truncate
                          ${isSelected ? 'text-white/70' : 'text-gray-400'}
                        `}>
                          {item.description}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <p className="text-xs text-gray-400 italic">No matching commands</p>
            <p className="text-[10px] text-gray-300 mt-1">Try a different search</p>
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-t border-gray-50 dark:border-gray-800">
        <div className="flex items-center justify-between text-[9px] text-gray-400">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[8px] font-medium border border-gray-200 dark:border-gray-600">↑↓</kbd>
            <span>Navigate</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[8px] font-medium border border-gray-200 dark:border-gray-600">↵</kbd>
            <span>Select</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-700 rounded text-[8px] font-medium border border-gray-200 dark:border-gray-600">Esc</kbd>
            <span>Close</span>
          </div>
        </div>
      </div>
    </div>
  );
});

SlashCommandList.displayName = 'SlashCommandList';
