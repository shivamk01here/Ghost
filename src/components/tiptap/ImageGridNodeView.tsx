import React, { useState, useRef, useCallback } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { Plus, Trash2, Grid3x3, Rows, Columns, X, Image as ImageIcon, LayoutTemplate, Maximize2 } from 'lucide-react';
import { ImageModal } from '../ImageModal';

export interface ImageGridNodeViewProps {
  node: {
    attrs: {
      columns: number | string;
      gap: number;
      images?: string[];
    };
  };
  updateAttributes: (attributes: Record<string, any>) => void;
  deleteNode: () => void;
}

export const ImageGridNodeView: React.FC<ImageGridNodeViewProps> = ({ node, updateAttributes, deleteNode }) => {
  const { columns, gap } = node.attrs;
  const images = Array.isArray(node.attrs.images) ? node.attrs.images : [];
  const [isHovered, setIsHovered] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gridLayouts = [
    { name: '2 Columns', cols: 2, icon: Columns },
    { name: '3 Columns', cols: 3, icon: Grid3x3 },
    { name: '4 Columns', cols: 4, icon: Grid3x3 },
    { name: 'Masonry', cols: 'masonry', icon: Rows },
    { name: 'Collage', cols: 'collage', icon: LayoutTemplate },
  ];

  const handleAddImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const filePromises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              resolve(event.target.result as string);
            } else {
              reject(new Error('Failed to read file'));
            }
          };
          reader.onerror = () => reject(new Error('File reading error'));
          reader.readAsDataURL(file);
        });
      });

      const newImages = await Promise.all(filePromises);
      updateAttributes({ images: [...images, ...newImages] });
    } catch (error) {
      console.error('Error uploading images:', error);
    } finally {
      if (e.target) e.target.value = '';
    }
  }, [images, updateAttributes]);

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    updateAttributes({ images: newImages });
  };

  const handleLayoutSelect = (layout: typeof gridLayouts[0]) => {
    updateAttributes({ columns: layout.cols });
    setShowLayoutMenu(false);
  };

  return (
    <NodeViewWrapper
      className="relative group my-6 select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowLayoutMenu(false); }}
    >
      {/* Toolbar - Always visible when hovered */}
      <div 
        className={`absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 z-50 transition-all duration-200 ${
          isHovered ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {/* Layout Selector */}
        <div className="relative">
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-lg shadow-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
          >
            <Grid3x3 size={14} />
            Layout
          </button>
          
          {showLayoutMenu && (
            <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 min-w-[140px] z-[60]">
              {gridLayouts.map((layout) => {
                const Icon = layout.icon;
                return (
                  <button
                    key={layout.name}
                    onClick={() => handleLayoutSelect(layout)}
                    className={`w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-2 ${columns === layout.cols ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600' : ''}`}
                  >
                    <Icon size={14} />
                    {layout.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Image Button */}
        <label className="flex items-center gap-1.5 px-3 py-2 bg-primary-500 text-white text-xs font-bold rounded-lg shadow-xl hover:bg-primary-600 transition-colors cursor-pointer">
          <Plus size={14} />
          Add Images
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleAddImage}
            className="hidden"
          />
        </label>

        {/* Delete Grid Button */}
        <button
          onClick={deleteNode}
          className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-lg shadow-xl transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Hover bridge */}
      <div 
        className={`absolute -top-12 left-0 right-0 h-16 z-40 ${isHovered ? 'block' : 'hidden'}`}
        onMouseEnter={() => setIsHovered(true)} 
      />

      {/* Grid Container */}
      <div className={`
        p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 transition-colors
        ${isHovered ? 'border-primary-500/30' : ''}
      `}>
        {images.length > 0 ? (
          <div className={
            columns === 'masonry' 
              ? 'columns-2 md:columns-3 space-y-3' 
              : columns === 'collage'
                ? 'grid grid-cols-2 md:grid-cols-4 grid-rows-[200px_200px]'
                : 'grid'
          } style={{
            gap: `${gap}px`,
            ...(typeof columns === 'number' || !isNaN(Number(columns))
              ? { gridTemplateColumns: `repeat(${columns}, 1fr)` } 
              : {})
          }}>
            {images.map((img, index) => (
              <div 
                key={index} 
                className={`
                  relative rounded-xl overflow-hidden group/img bg-gray-200 dark:bg-gray-800 cursor-pointer
                  ${columns === 'masonry' ? 'break-inside-avoid mb-3' : 'aspect-square'}
                  ${columns === 'collage' && index === 0 ? 'col-span-2 row-span-2' : ''}
                  ${columns === 'collage' && index > 0 ? 'aspect-square' : ''}
                `}
                onClick={() => setSelectedImage(img)}
              >
                <img 
                  src={img} 
                  alt="" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                  loading="lazy"
                />
                
                {/* Overlay Controls */}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/img:opacity-100 transition-all">
                   <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(img);
                    }}
                    className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white backdrop-blur-sm"
                  >
                    <Maximize2 size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    className="p-1.5 bg-black/50 hover:bg-red-500 rounded-lg text-white backdrop-blur-sm"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
            
            {/* Add more placeholder */}
            <label className={`
              rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/20 transition-colors
              ${columns === 'masonry' ? 'aspect-square' : ''}
              ${columns === 'collage' ? 'aspect-square' : ''}
              ${typeof columns === 'number' ? 'aspect-square' : ''}
            `}>
              <div className="text-center">
                <Plus size={24} className="mx-auto text-gray-300 dark:text-gray-600 mb-1" />
                <span className="text-[10px] text-gray-400">Add</span>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleAddImage}
                className="hidden"
              />
            </label>
          </div>
        ) : (
          /* Empty State */
          <label className="flex flex-col items-center justify-center min-h-[200px] cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/30 rounded-xl transition-colors p-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
              <ImageIcon size={28} className="text-gray-400" />
            </div>
            <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">Image Grid</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
             {(typeof columns === 'number' || !isNaN(Number(columns))) ? `${columns} columns` : columns === 'masonry' ? 'Masonry' : 'Collage'} layout
            </p>
            <div className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-xs font-bold rounded-lg shadow-sm">
              <Plus size={14} />
              Add Images
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleAddImage}
              className="hidden"
            />
          </label>
        )}
      </div>
      <ImageModal 
        src={selectedImage || ''}
        isOpen={!!selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </NodeViewWrapper>
  );
};
