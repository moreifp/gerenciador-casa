import { useRef } from 'react';
import { Camera, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface PhotoUploaderProps {
  photos: File[];
  onPhotosChange: (photos: File[]) => void;
  maxPhotos?: number;
  className?: string;
}

export default function PhotoUploader({ photos, onPhotosChange, maxPhotos = 5, className }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxPhotos - photos.length;
    onPhotosChange([...photos, ...files.slice(0, remaining)]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (idx: number) => {
    onPhotosChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {photos.map((file, idx) => (
          <div key={idx} className="relative h-24 w-24 rounded-xl border border-border group">
            <img
              src={URL.createObjectURL(file)}
              alt={`Foto ${idx + 1}`}
              className="h-full w-full rounded-xl object-cover"
            />
            <Button variant="destructive" size="icon" aria-label="Remover foto"
              type="button"
              onClick={() => remove(idx)}
              className="absolute top-0 right-0 rounded-full"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        ))}

        {photos.length < maxPhotos && (
          <Button variant="outline"
            type="button"
            onClick={() => inputRef.current?.click()}
            className="h-24 w-24 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors"
          >
            {photos.length === 0 ? <Camera className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            <span className="text-sm">Foto</span>
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        capture="environment"
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
