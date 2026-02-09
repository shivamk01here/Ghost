import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, X } from 'lucide-react';
import { useEntries } from '../hooks/useDatabase';

export const GalleryPage: React.FC = () => {
  const { entries } = useEntries();
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<{ src: string; entryId: string } | null>(null);

  // Collect all images with their entry references
  const allImages = entries.flatMap((entry) =>
    entry.images.map((image, index) => ({
      src: image,
      entryId: entry.id,
      entryDate: entry.date,
      index,
      totalImages: entry.images.length,
    }))
  );

  if (allImages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
          <ImageIcon className="text-primary-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          No images yet
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          Your journal photos will appear here. Add images to your entries to build your visual timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Gallery
        </h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {allImages.length} {allImages.length === 1 ? 'photo' : 'photos'}
        </span>
      </div>

      {/* Masonry Grid */}
      <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
        {allImages.map((image, idx) => (
          <div
            key={`${image.entryId}-${image.index}`}
            className="break-inside-avoid cursor-pointer group"
            onClick={() => setSelectedImage({ src: image.src, entryId: image.entryId })}
          >
            <div className="relative overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
              <img
                src={image.src}
                alt={`Journal photo ${idx + 1}`}
                className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Close"
          >
            <X size={24} />
          </button>
          
          <div
            className="max-w-4xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage.src}
              alt="Gallery photo"
              className="w-full h-full object-contain rounded-lg"
            />
            <div className="mt-4 flex justify-center">
              <button
                onClick={() => navigate(`/editor/${selectedImage.entryId}`)}
                className="btn-primary"
              >
                View Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
