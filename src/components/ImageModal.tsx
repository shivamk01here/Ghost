import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Download, ExternalLink } from 'lucide-react';

interface ImageModalProps {
  src: string;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageModal: React.FC<ImageModalProps> = ({ src, isOpen, onClose }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  if (!isOpen) return null;

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) setPosition({ x: 0, y: 0 }); // Reset position on full zoom out
      return newScale;
    });
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${Date.now()}.png`; // Simple filename
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e) {
      console.error('Download failed', e);
      window.open(src, '_blank'); // Fallback
    }
  };

  const handleNewTab = () => {
    window.open(src, '_blank');
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation(); // prevent page scroll
      if (e.deltaY < 0) handleZoomIn();
      else handleZoomOut();
    }
  };
  
  // Basic drag implementation for zoomed image
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
       setIsDragging(true);
       setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  const handleMouseUp = () => setIsDragging(false);

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div 
        className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-gray-900/50 backdrop-blur-md rounded-full border border-white/10 z-50 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={handleZoomIn}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={handleZoomOut}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button 
          onClick={handleDownload}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip"
          title="Download"
        >
          <Download size={20} />
        </button>
        <button 
          onClick={handleNewTab}
          className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors tooltip"
          title="Open in New Tab"
        >
          <ExternalLink size={20} />
        </button>
        <div className="w-px h-4 bg-white/20 mx-1" />
        <button 
          onClick={onClose}
          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-colors"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <div 
        className="relative w-full h-full flex items-center justify-center p-8 cursor-grab active:cursor-grabbing"
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img 
          src={src} 
          alt="Full view" 
          className="max-h-full max-w-full object-contain transition-transform duration-200 ease-out"
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? 'move' : 'default' 
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};
