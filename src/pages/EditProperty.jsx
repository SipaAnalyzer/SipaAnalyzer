import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { recordAuditLog } from '@/utils/auditLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { WORKFLOW_STATUSES } from '../utils/calculations';

const parseOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  return Number(value);
};

export default function EditProperty() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: () => base44.entities.Property.get(propertyId),
  });

  const [form, setForm] = useState({});
  const [uploading, setUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Le fichier ne doit pas dépasser 20 Mo');
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('property-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('property-files')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, lien_piece_jointe: publicUrl }));
      toast.success('Fichier uploadé');
    } catch (err) {
      console.error('[Upload]', err);
      toast.error("Erreur lors de l'upload du fichier");
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('L\'image ne doit pas dépasser 20 Mo');
      return;
    }

    setImageUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('property-files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('property-files')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, image_url: publicUrl }));
      toast.success('Image uploadée');
    } catch (err) {
      console.error('[ImageUpload]', err);
      toast.error("Erreur lors de l'upload de l'image");
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    if (property) setForm({
      nom_bien: property.nom_bien || '', adresse: property.adresse || '', ville: property.ville || '',
      canton: property.canton || '', pays: property.pays || 'Suisse',
      annee_construction: property.annee_construction ?? '', surface: property.surface ?? '',
      nombre_logements: property.nombre_logements ?? '', nombre_bureaux: property.nombre_bureaux ?? '', nombre_parkings: property.nombre_parkings ?? '', statut: property.statut || 'brouillon',
      lien_annonce: property.lien_annonce || '', lien_piece_jointe: property.lien_piece_jointe || '',
      image_url: property.image_url || '', latitude: property.latitude ?? '', longitude: property.longitude ?? '',
    });
  }, [property]);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: typeof e === 'string' ? e : e.target.value }));

  const update = useMutation({
    mutationFn: () => base44.entities.Property.update(propertyId, {
      ...form,
      ...(!form.lien_piece_jointe ? { lien_piece_jointe: undefined } : {}),
      annee_construction: parseOptionalNumber(form.annee_construction),
      surface: parseOptionalNumber(form.surface),
      nombre_logements: parseOptionalNumber(form.nombre_logements),
      nombre_bureaux: parseOptionalNumber(form.nombre_bureaux),
      nombre_parkings: parseOptionalNumber(form.nombre_parkings),
      latitude: parseOptionalNumber(form.latitude),
      longitude: parseOptionalNumber(form.longitude),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['comments', propertyId] });
      toast.success('Bien mis à jour');
      recordAuditLog({ eventType: 'property_updated', targetType: 'property', targetId: propertyId, targetLabel: form.nom_bien || undefined });
      navigate(`/property/${propertyId}`);
    },
    onError: (error) => {
      console.error('[EditProperty] update error:', error);
      toast.error("Impossible d'enregistrer les modifications");
    },
  });

  if (isLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Modifier le bien</h1>
          <p className="text-sm text-muted-foreground">Mettez à jour les informations</p>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Nom du bien *</Label><Input value={form.nom_bien || ''} onChange={set('nom_bien')} className="bg-background border-border" /></div>
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Adresse</Label><Input value={form.adresse || ''} onChange={set('adresse')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Ville *</Label><Input value={form.ville || ''} onChange={set('ville')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Canton</Label><Input value={form.canton || ''} onChange={set('canton')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Pays</Label><Input value={form.pays || ''} onChange={set('pays')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Année de construction</Label><Input type="number" value={form.annee_construction || ''} onChange={set('annee_construction')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Surface (m²)</Label><Input type="number" value={form.surface || ''} onChange={set('surface')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de logements</Label><Input type="number" value={form.nombre_logements || ''} onChange={set('nombre_logements')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de bureaux</Label><Input type="number" value={form.nombre_bureaux || ''} onChange={set('nombre_bureaux')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de parkings</Label><Input type="number" value={form.nombre_parkings || ''} onChange={set('nombre_parkings')} className="bg-background border-border" /></div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Photo du bien</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={imageUploading}
                onClick={() => document.getElementById('edit-image-upload')?.click()}
              >
                {imageUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {imageUploading ? 'Upload...' : 'Choisir une image'}
              </Button>
              <input
                id="edit-image-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleImageUpload}
              />
              {form.image_url && (
                <div className="flex items-center gap-2">
                  <img src={form.image_url} alt="Aperçu" className="h-10 w-10 rounded object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, image_url: '' }))}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Lien de l'annonce</Label><Input value={form.lien_annonce || ''} onChange={set('lien_annonce')} placeholder="https://..." className="bg-background border-border" /></div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Pièce jointe (PDF, Word, PowerPoint)</Label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploading}
                onClick={() => document.getElementById('edit-file-upload')?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Upload...' : 'Choisir un fichier'}
              </Button>
              <input
                id="edit-file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                className="hidden"
                onChange={handleFileUpload}
              />
              {form.lien_piece_jointe && (
                <a href={form.lien_piece_jointe} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <FileText className="h-3.5 w-3.5" />
                  Voir le fichier
                </a>
              )}
            </div>
          </div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Latitude (GPS)</Label><Input type="number" value={form.latitude || ''} onChange={set('latitude')} placeholder="46.5197" className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Longitude (GPS)</Label><Input type="number" value={form.longitude || ''} onChange={set('longitude')} placeholder="6.6323" className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Statut</Label>
            <Select value={form.statut || 'brouillon'} onValueChange={set('statut')}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WORKFLOW_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button onClick={() => update.mutate()} disabled={!form.nom_bien || !form.ville || update.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {update.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </div>
    </div>
  );
}
