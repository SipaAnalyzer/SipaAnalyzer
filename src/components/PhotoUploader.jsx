import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadPropertyImages } from '@/utils/documents';

export default function PhotoUploader({ photos = [], onChange, label = 'Photos du bien' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await uploadPropertyImages(files);
      onChange([...photos, ...uploaded]);
      toast.success(uploaded.length > 1 ? `${uploaded.length} photos uploadées` : 'Photo uploadée');
    } catch (err) {
      toast.error(err?.message || "Erreur lors de l'upload des photos");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    onChange(photos.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? 'Upload...' : 'Choisir des photos'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
        {photos.length > 0 && (
          <span className="text-xs text-muted-foreground">{photos.length} photo(s)</span>
        )}
      </div>
      {photos.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo, index) => (
            <div key={`${photo.url}-${index}`} className="group relative">
              <img
                src={photo.url}
                alt={photo.name || `Photo ${index + 1}`}
                className="h-16 w-full rounded border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(index)}
                className="absolute -right-1.5 -top-1.5 rounded-full bg-background border border-border p-0.5 text-muted-foreground hover:text-destructive shadow-sm"
                title="Retirer cette photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
