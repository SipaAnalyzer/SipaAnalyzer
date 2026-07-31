import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, FileText, X } from 'lucide-react';
import { toast } from 'sonner';
import { uploadPropertyFiles } from '@/utils/documents';

export default function DocumentUploader({ documents = [], onChange, label = 'Documents (PDF, Word, PowerPoint)' }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploaded = await uploadPropertyFiles(files);
      onChange([...documents, ...uploaded]);
      toast.success(uploaded.length > 1 ? `${uploaded.length} fichiers uploadés` : 'Fichier uploadé');
    } catch (err) {
      toast.error(err?.message || "Erreur lors de l'upload des fichiers");
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (index) => {
    onChange(documents.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="space-y-2">
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
            {uploading ? 'Upload...' : 'Choisir des fichiers'}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            multiple
            className="hidden"
            onChange={handleFileUpload}
          />
          {documents.length > 0 && (
            <span className="text-xs text-muted-foreground">{documents.length} fichier(s)</span>
          )}
        </div>
        {documents.length > 0 && (
          <ul className="space-y-1.5">
            {documents.map((doc, index) => (
              <li key={`${doc.url}-${index}`} className="flex items-center gap-2 text-xs">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-1.5 text-primary hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{doc.name || doc.url}</span>
                </a>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="ml-auto shrink-0 text-muted-foreground hover:text-destructive"
                  title="Retirer ce fichier"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
