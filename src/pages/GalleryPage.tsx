import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Image as ImageIcon, ExternalLink } from 'lucide-react';
import { useEntries } from '../hooks/useDatabase';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

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
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
          <ImageIcon className="text-muted-foreground" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-3">
          No images yet
        </h2>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          Your journal photos will appear here. Add images to your entries to build your visual timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Gallery
        </h1>
        <span className="text-sm text-muted-foreground">
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
            <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
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
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-4xl w-full p-0 overflow-hidden bg-black/95 border-none">
          <VisuallyHidden.Root>
            <DialogTitle>Image Preview</DialogTitle>
          </VisuallyHidden.Root>
          {selectedImage && (
            <div className="relative flex items-center justify-center p-4 h-[85vh]">
              <img
                src={selectedImage.src}
                alt="Gallery photo"
                className="max-w-full max-h-full object-contain rounded-sm"
              />
              <Button
                onClick={() => navigate(`/editor/${selectedImage.entryId}`)}
                variant="secondary"
                size="sm"
                className="absolute bottom-6 right-6 gap-2"
              >
                View Entry <ExternalLink size={14} />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
