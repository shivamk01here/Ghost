import React, { useState } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { Trash2, Grid3x3, Columns2, Columns3, LayoutGrid } from 'lucide-react';

export interface ColumnsNodeViewProps {
  node: {
    attrs: {
      columnCount: number;
    };
  };
  updateAttributes: (attributes: Record<string, any>) => void;
  deleteNode: () => void;
  editor: any;
}

export const ColumnsNodeView: React.FC<ColumnsNodeViewProps> = ({ 
  node, 
  updateAttributes, 
  deleteNode,
}) => {
  const { columnCount } = node.attrs;
  const [isHovered, setIsHovered] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);

  const layouts = [
    { name: '2 Columns', count: 2, icon: Columns2 },
    { name: '3 Columns', count: 3, icon: Columns3 },
    { name: '4 Columns', count: 4, icon: LayoutGrid },
    { name: '5 Columns', count: 5, icon: Grid3x3 },
  ];

  const handleLayoutSelect = (count: number) => {
    updateAttributes({ columnCount: count });
    setShowLayoutMenu(false);
  };

  return (
    <NodeViewWrapper
      className="columns-wrapper relative group my-4"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowLayoutMenu(false); }}
    >
      {/* Floating Toolbar */}
      <div 
        className={`absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-50 transition-all duration-200 ${
          isHovered ? 'opacity-100 pointer-events-auto translate-y-0' : 'opacity-0 pointer-events-none translate-y-1'
        }`}
      >
        {/* Layout Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-medium rounded-lg shadow-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Grid3x3 size={14} />
            {columnCount} cols
          </button>
          
          {showLayoutMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-1.5 min-w-[130px] z-[60]">
              {layouts.map((layout) => {
                const Icon = layout.icon;
                return (
                  <button
                    key={layout.count}
                    onClick={() => handleLayoutSelect(layout.count)}
                    className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                      columnCount === layout.count 
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 font-medium' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon size={14} />
                    {layout.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete Button */}
        <button
          onClick={deleteNode}
          className="flex items-center gap-1 px-2 py-1.5 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 text-xs font-medium rounded-lg shadow-lg transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Hover bridge */}
      <div 
        className={`absolute -top-10 left-0 right-0 h-12 z-40 ${isHovered ? 'block' : 'hidden'}`}
        onMouseEnter={() => setIsHovered(true)} 
      />

      {/* Columns Container */}
      <div 
        className={`columns-container rounded-lg transition-all duration-200 ${
          isHovered ? 'ring-2 ring-primary-500/30' : ''
        }`}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap: '16px',
        }}
      >
        <NodeViewContent className="columns-content" />
      </div>
    </NodeViewWrapper>
  );
};
