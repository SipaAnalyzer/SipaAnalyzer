import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { recordAuditLog } from '@/utils/auditLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { WORKFLOW_STATUSES } from '../utils/calculations';
import DocumentUploader from '@/components/DocumentUploader';
import PhotoUploader from '@/components/PhotoUploader';
import { parseDocuments } from '@/utils/documents';

const parseOptionalNumber = (value) => {
  if (value === '' || value === null || value === undefined) {
    return null;
  }

  return Number(value);
};

const toDateInputValue = (value) => {
  if (!value) return '';
  return String(value).slice(0, 10);
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

  useEffect(() => {
    if (property) {
      const photos = parseDocuments(property.photos);
      setForm({
        nom_bien: property.nom_bien || '', adresse: property.adresse || '', ville: property.ville || '',
        canton: property.canton || '', pays: property.pays || 'Suisse',
        date_creation_bien: toDateInputValue(property.date_creation_bien || property.created_at || property.created_date),
        annee_construction: property.annee_construction ?? '', surface: property.surface ?? '',
        nombre_logements: property.nombre_logements ?? '', nombre_bureaux: property.nombre_bureaux ?? '', nombre_parkings: property.nombre_parkings ?? '', statut: property.statut || 'en_cours',
        courtier_apporteur_affaire: property.courtier_apporteur_affaire || '',
        lien_annonce: property.lien_annonce || '', lien_piece_jointe: property.lien_piece_jointe || '',
        documents: parseDocuments(property.documents),
        photos: photos.length > 0
          ? photos
          : (property.image_url ? [{ name: 'Photo principale', url: property.image_url }] : []),
        latitude: property.latitude ?? '', longitude: property.longitude ?? '',
      });
    }
  }, [property]);

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: typeof e === 'string' ? e : e.target.value }));

  const update = useMutation({
    mutationFn: () => base44.entities.Property.update(propertyId, {
      ...form,
      ...(!form.lien_piece_jointe ? { lien_piece_jointe: undefined } : {}),
      documents: form.documents || [],
      photos: form.photos || [],
      image_url: form.photos?.[0]?.url || null,
      date_creation_bien: form.date_creation_bien || null,
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
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Date du bien</Label><Input type="date" value={form.date_creation_bien || ''} onChange={set('date_creation_bien')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Année de construction</Label><Input type="number" value={form.annee_construction || ''} onChange={set('annee_construction')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Surface (m²)</Label><Input type="number" value={form.surface || ''} onChange={set('surface')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de logements</Label><Input type="number" value={form.nombre_logements || ''} onChange={set('nombre_logements')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de bureaux</Label><Input type="number" value={form.nombre_bureaux || ''} onChange={set('nombre_bureaux')} className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de parkings</Label><Input type="number" value={form.nombre_parkings || ''} onChange={set('nombre_parkings')} className="bg-background border-border" /></div>
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Courtier / apporteur d'affaire</Label><Input value={form.courtier_apporteur_affaire || ''} onChange={set('courtier_apporteur_affaire')} placeholder="Nom, societe ou contact" className="bg-background border-border" /></div>
          <div className="sm:col-span-2">
            <PhotoUploader
              photos={form.photos || []}
              onChange={(photos) => setForm(prev => ({ ...prev, photos }))}
            />
          </div>
          <div className="sm:col-span-2"><Label className="text-xs text-muted-foreground mb-1.5 block">Lien de l'annonce</Label><Input value={form.lien_annonce || ''} onChange={set('lien_annonce')} placeholder="https://..." className="bg-background border-border" /></div>
          <div className="sm:col-span-2">
            <DocumentUploader
              documents={form.documents || []}
              onChange={(docs) => setForm(prev => ({ ...prev, documents: docs }))}
            />
          </div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Latitude (GPS)</Label><Input type="number" value={form.latitude || ''} onChange={set('latitude')} placeholder="46.5197" className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Longitude (GPS)</Label><Input type="number" value={form.longitude || ''} onChange={set('longitude')} placeholder="6.6323" className="bg-background border-border" /></div>
          <div><Label className="text-xs text-muted-foreground mb-1.5 block">Statut</Label>
            <Select value={form.statut || 'en_cours'} onValueChange={set('statut')}>
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
