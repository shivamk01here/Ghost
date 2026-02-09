import React, { useState, useCallback, useRef, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Trash2, AlignLeft, AlignCenter, AlignRight, Grid, Maximize2 } from 'lucide-react';
import { ImageModal } from '../ImageModal';

export interface ImageResizeNodeViewProps {
  node: {
    attrs: {
      src: string;
      width: string;
      height: string;
      align: string;
    };
  };
  updateAttributes: (attributes: Record<string, any>) => void;
  deleteNode: () => void;
}

export const ImageResizeNodeView: React.FC<ImageResizeNodeViewProps> = ({ node, updateAttributes, deleteNode }) => {
  const { src, width, height, align } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [showGridMenu, setShowGridMenu] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width, height });

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const newWidth = `${e.clientX - rect.left}px`;
    const newHeight = 'auto';
    
    setDimensions({ width: newWidth, height: newHeight });
  }, [isResizing]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    updateAttributes({ width: dimensions.width, height: dimensions.height });
  }, [dimensions, updateAttributes]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
    } else {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleResizeMove);
      window.removeEventListener('mouseup', handleResizeEnd);
    };
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const handleAlignment = useCallback((newAlign: string) => {
    updateAttributes({ align: newAlign });
  }, [updateAttributes]);

  const gridLayouts = [
    { name: 'Single', cols: 1, width: '100%' },
    { name: 'Two Columns', cols: 2, width: '48%' },
    { name: 'Three Columns', cols: 3, width: '31%' },
    { name: 'Four Columns', cols: 4, width: '23%' },
    { name: 'Masonry', cols: 'masonry', width: 'auto' },
  ];

  const handleGridSelect = useCallback((layout: typeof gridLayouts[0]) => {
    if (layout.cols === 'masonry') {
      updateAttributes({ width: 'auto', height: 'auto' });
    } else {
      updateAttributes({ width: layout.width, height: 'auto' });
    }
    setShowGridMenu(false);
  }, [updateAttributes]);

  return (
    <NodeViewWrapper
      className="relative group my-4"
      style={{ display: 'block', textAlign: align as any }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative inline-block" style={{ width: dimensions.width }}>
        <img
          ref={imageRef}
          src={src}
          alt=""
          style={{
            width: dimensions.width,
            height: dimensions.height,
            maxWidth: '100%',
            borderRadius: '12px',
            cursor: isResizing ? 'ew-resize' : 'default',
          }}
          className="rounded-xl shadow-lg border border-gray-100 dark:border-gray-800"
        />

        {isHovered && !isResizing && (
          <>
            {/* Resize Handle */}
            <div
              ref={resizeHandleRef}
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary-500 rounded-r-xl opacity-0 group-hover:opacity-100 transition-opacity"
              onMouseDown={handleResizeStart}
            />

            {/* Controls Toolbar with Hover Bridge */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 pt-10 group">
              <div className="flex items-center gap-1 bg-gray-900/95 dark:bg-gray-100/95 backdrop-blur-md rounded-xl px-1.5 py-1.5 shadow-2xl border border-white/10 dark:border-black/10 scale-95 group-hover:scale-100 transition-all z-10">
              <button
                onClick={() => handleAlignment('left')}
                className={`p-1.5 rounded transition-colors ${align === 'left' ? 'bg-primary-500 text-white' : 'text-white dark:text-gray-900 hover:bg-white/10 dark:hover:bg-black/10'}`}
                title="Align Left"
              >
                <AlignLeft size={14} />
              </button>
              <button
                onClick={() => handleAlignment('center')}
                className={`p-1.5 rounded transition-colors ${align === 'center' ? 'bg-primary-500 text-white' : 'text-white dark:text-gray-900 hover:bg-white/10 dark:hover:bg-black/10'}`}
                title="Align Center"
              >
                <AlignCenter size={14} />
              </button>
              <button
                onClick={() => handleAlignment('right')}
                className={`p-1.5 rounded transition-colors ${align === 'right' ? 'bg-primary-500 text-white' : 'text-white dark:text-gray-900 hover:bg-white/10 dark:hover:bg-black/10'}`}
                title="Align Right"
              >
                <AlignRight size={14} />
              </button>

              <div className="w-px h-4 bg-gray-600 dark:bg-gray-400 mx-1" />

              <button
                onClick={() => setIsModalOpen(true)}
                className={`p-1.5 rounded transition-colors text-white dark:text-gray-900 hover:bg-white/10 dark:hover:bg-black/10`}
                title="Full Screen"
              >
                <Maximize2 size={14} />
              </button>
              
              <div className="w-px h-4 bg-gray-600 dark:bg-gray-400 mx-1" />
              
              <div className="relative">
                <button
                  onClick={() => setShowGridMenu(!showGridMenu)}
                  className={`p-1.5 rounded transition-colors text-white dark:text-gray-900 hover:bg-white/10 dark:hover:bg-black/10`}
                  title="Grid Layout"
                >
                  <Grid size={14} />
                </button>
                
                {showGridMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[140px]">
                    {gridLayouts.map((layout) => (
                      <button
                        key={layout.name}
                        onClick={() => handleGridSelect(layout)}
                        className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center gap-2"
                      >
                        <div className={`flex gap-1`}>
                          {Array.from({ length: layout.cols === 'masonry' ? 3 : (layout.cols as number) }).map((_, i) => (
                            <div key={i} className="w-2 h-2 bg-primary-500 rounded-sm" />
                          ))}
                        </div>
                        {layout.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-px h-4 bg-gray-600 dark:bg-gray-400 mx-1" />
              
              <button
                onClick={deleteNode}
                className="p-1.5 rounded transition-colors text-red-400 hover:bg-red-500/20"
                title="Remove Image"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </>
        )}
      </div>
      <ImageModal 
        src={src}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </NodeViewWrapper>
  );
};
