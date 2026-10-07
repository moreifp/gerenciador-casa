import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface MediaPreviewProps {
  imageUrls?: string[];
  audioUrl?: string | null;
  className?: string;
}

export default function MediaPreview({ imageUrls, audioUrl, className }: MediaPreviewProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const hasImages = imageUrls && imageUrls.length > 0;
  const hasAudio = !!audioUrl;

  if (!hasImages && !hasAudio) return null;

  return (
    <div className={cn('space-y-2', className)}>
      {hasImages && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setLightbox(url)}
              className="h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/30 transition-all"
            >
              <img src={url} alt={`Imagem ${idx + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {hasAudio && (
        <audio src={audioUrl} controls className="h-14 w-full max-w-xs" />
      )}

      <Dialog open={!!lightbox} onOpenChange={() => setLightbox(null)}>
        <DialogContent className="max-w-2xl p-2">
          {lightbox && (
            <img src={lightbox} alt="Preview" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
