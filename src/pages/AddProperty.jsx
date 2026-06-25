import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { recordAuditLog } from '@/utils/auditLogs';
import { notifyAllUsers } from '@/utils/notifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Upload, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AddProperty() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    nom_bien: '', adresse: '', ville: '', canton: '', pays: 'Suisse',
    annee_construction: '', surface: '', nombre_logements: '', statut: 'brouillon',
    lien_annonce: '', lien_piece_jointe: '', latitude: '', longitude: '',
  });

  const set = (key) => (e) => setForm(prev => ({ ...prev, [key]: typeof e === 'string' ? e : e.target.value }));

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

  const create = useMutation({
    mutationFn: () => base44.entities.Property.create({
      ...form,
      ...(!form.lien_piece_jointe ? { lien_piece_jointe: undefined } : {}),
      annee_construction: form.annee_construction ? parseInt(form.annee_construction) : undefined,
      surface: form.surface ? parseFloat(form.surface) : undefined,
      nombre_logements: form.nombre_logements ? parseInt(form.nombre_logements) : undefined,
      latitude: form.latitude !== '' ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude !== '' ? parseFloat(form.longitude) : undefined,
    }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast.success('Bien ajouté avec succès');
      recordAuditLog({ eventType: 'property_created', targetType: 'property', targetId: result.id, targetLabel: result.nom_bien });
      notifyAllUsers({ eventType: 'property_created', targetType: 'property', targetId: result.id, targetLabel: result.nom_bien });
      navigate(`/property/${result.id}`);
    },
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/properties"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="font-display text-2xl font-bold">Ajouter un bien</h1>
          <p className="text-sm text-muted-foreground">Renseignez les informations du bien immobilier</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Nom du bien *</Label>
            <Input value={form.nom_bien} onChange={set('nom_bien')} placeholder="Ex: Résidence du Lac" className="bg-background border-border" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Adresse</Label>
            <Input value={form.adresse} onChange={set('adresse')} placeholder="Rue et numéro" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Ville *</Label>
            <Input value={form.ville} onChange={set('ville')} placeholder="Ex: Lausanne" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Canton</Label>
            <Input value={form.canton} onChange={set('canton')} placeholder="Ex: Vaud" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Pays</Label>
            <Input value={form.pays} onChange={set('pays')} className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Année de construction</Label>
            <Input type="number" value={form.annee_construction} onChange={set('annee_construction')} placeholder="2005" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Surface (m²)</Label>
            <Input type="number" value={form.surface} onChange={set('surface')} placeholder="450" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Nombre de logements</Label>
            <Input type="number" value={form.nombre_logements} onChange={set('nombre_logements')} placeholder="12" className="bg-background border-border" />
          </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Lien de l'annonce</Label>
              <Input value={form.lien_annonce} onChange={set('lien_annonce')} placeholder="https://..." className="bg-background border-border" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Pièce jointe (PDF, Word, PowerPoint)</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 relative"
                  disabled={uploading}
                  onClick={() => document.getElementById('file-upload')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {uploading ? 'Upload...' : 'Choisir un fichier'}
                </Button>
                <input
                  id="file-upload"
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
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Latitude (GPS)</Label>
            <Input type="number" value={form.latitude} onChange={set('latitude')} placeholder="46.5197" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Longitude (GPS)</Label>
            <Input type="number" value={form.longitude} onChange={set('longitude')} placeholder="6.6323" className="bg-background border-border" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Statut</Label>
            <Select value={form.statut} onValueChange={set('statut')}>
              <SelectTrigger className="bg-background border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => create.mutate()} disabled={!form.nom_bien || !form.ville || create.isPending} className="gap-2">
            <Save className="h-4 w-4" /> {create.isPending ? 'Enregistrement...' : 'Enregistrer le bien'}
          </Button>
        </div>
      </div>
    </div>
  );
}