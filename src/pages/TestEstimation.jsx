import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calculator, RotateCcw, Frown, Meh, Smile, Plus, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { recordAuditLog } from '@/utils/auditLogs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { formatCHF, formatPercent } from '@/utils/calculations';
import { buildAnalysisFromEstimation, calculateQuickEstimation, parseEstimationNumber } from '@/utils/quickEstimation';
import { readEstimationDraft, resolveEstimationAnalysisDraft, writeEstimationDraft } from '@/utils/estimationDraft';

const INITIAL_VALUES = { rent: '', chargesPercent: '15', price: '', grossYield: '' };
const INITIAL_PROPERTY = { nom_bien: '', ville: '', adresse: '' };

export default function TestEstimation() {
  const { user } = useAuth();
  return <EstimationWorkspace key={user?.id} userId={user?.id} />;
}

function EstimationWorkspace({ userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { permissions, isAdmin } = usePermissions();
  const canCreate = isAdmin || (permissions.can_create_property && permissions.can_create_analysis);
  const canContinue = isAdmin || permissions.can_create_analysis;
  const [saved] = useState(() => readEstimationDraft(userId));
  const [mode, setMode] = useState(saved?.mode === 'yield' ? 'yield' : 'price');
  const [values, setValues] = useState({ ...INITIAL_VALUES, ...saved?.values });
  const [propertyDetails, setPropertyDetails] = useState({ ...INITIAL_PROPERTY, ...saved?.propertyDetails });
  const [createdProperty, setCreatedProperty] = useState(saved?.createdProperty || null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creationError, setCreationError] = useState('');
  const creationInFlight = useRef(false);
  const result = calculateQuickEstimation({ mode, ...values });
  const calculatingPrice = mode === 'price';
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  useEffect(() => {
    writeEstimationDraft(userId, { mode, values, propertyDetails, createdProperty });
  }, [userId, mode, values, propertyDetails, createdProperty]);

  const continueAnalysis = (property) => {
    const draft = resolveEstimationAnalysisDraft(userId, property.id);
    if (draft?.analysisId) {
      navigate(`/analysis/${draft.analysisId}`);
      return;
    }
    navigate(`/new-analysis?propertyId=${encodeURIComponent(property.id)}&source=estimation`, {
      state: { estimationDraft: draft ? { ...draft, userId } : null },
    });
  };

  const createProperty = useMutation({
    mutationFn: ({ details }) => base44.entities.Property.create({
      nom_bien: details.nom_bien.trim(),
      ville: details.ville.trim(),
      adresse: details.adresse.trim(),
      pays: 'Suisse',
      statut: 'en_cours',
      date_creation_bien: new Date().toISOString().slice(0, 10),
    }),
    onSuccess: (property, { estimation, details }) => {
      const initialData = buildAnalysisFromEstimation(estimation, property.id);
      // Persist before navigating so a return/reload reuses this property.
      writeEstimationDraft(userId, { property, initialData, mode: estimation.mode, estimation }, property.id);
      const { mode: submittedMode, ...submittedValues } = estimation;
      writeEstimationDraft(userId, { mode: submittedMode, values: submittedValues, propertyDetails: details, createdProperty: property });
      setCreatedProperty(property);
      queryClient.setQueryData(['property', property.id], property);
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['nav-alert-properties'] });
      void recordAuditLog({
        eventType: 'property_created', targetType: 'property', targetId: property.id,
        targetLabel: property.nom_bien, metadata: { source: 'test_estimation' },
      }).catch((error) => console.warn('[Estimation] audit log failed:', error));
      toast.success('Bien créé. Complétez maintenant son analyse.');
      setDialogOpen(false);
      continueAnalysis(property);
    },
    onError: (error) => {
      console.error('[Estimation] property creation failed:', error);
      setCreationError('Impossible de créer le bien. Vos informations sont conservées, vous pouvez réessayer.');
    },
    onSettled: () => { creationInFlight.current = false; },
  });

  const handleCreate = (event) => {
    event.preventDefault();
    if (creationInFlight.current || !canCreate || !result) return;
    if (createdProperty) return continueAnalysis(createdProperty);
    if (!propertyDetails.nom_bien.trim() || !propertyDetails.ville.trim()) return;
    creationInFlight.current = true;
    setCreationError('');
    // Capture the figures at confirmation, rather than reading mutable screen state after the request.
    createProperty.mutate({ details: { ...propertyDetails }, estimation: { mode, ...values } });
  };

  const reset = () => {
    setValues(INITIAL_VALUES);
    setMode('price');
    setPropertyDetails(INITIAL_PROPERTY);
    setCreatedProperty(null);
    setCreationError('');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Test estimation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Un prix ou un rendement, en quelques secondes.</p>
        </div>
        <Button variant="ghost" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> {createdProperty ? 'Nouvelle estimation' : 'Réinitialiser'}
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-medium">Que souhaitez-vous calculer ?</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Scénario d'estimation">
          <Button disabled={!!createdProperty} variant={calculatingPrice ? 'default' : 'outline'} aria-pressed={calculatingPrice}
            onClick={() => setMode('price')} className="h-auto min-h-12 whitespace-normal py-3">
            Estimer le prix du bien
          </Button>
          <Button disabled={!!createdProperty} variant={!calculatingPrice ? 'default' : 'outline'} aria-pressed={!calculatingPrice}
            onClick={() => setMode('yield')} className="h-auto min-h-12 whitespace-normal py-3">
            Calculer le rendement brut
          </Button>
        </div>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <fieldset disabled={!!createdProperty} className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="font-heading font-semibold">Vos paramètres</h2>
          <EstimationInput id="estimation-rent" label="Revenu locatif annuel" unit="CHF / an"
            value={values.rent} onChange={set('rent')} placeholder="Ex. 100000"
            hint="Total des loyers sur une année, avant charges." />
          <EstimationInput id="estimation-charges" label="Charges opérationnelles" unit="%"
            value={values.chargesPercent} onChange={set('chargesPercent')} max={100} allowZero
            hint="15 % des loyers par défaut. Ajustez selon le bien." />
          {calculatingPrice ? (
            <EstimationInput key="yield" id="estimation-yield" label="Rendement brut souhaité" unit="%"
              value={values.grossYield} onChange={set('grossYield')} placeholder="Ex. 5"
              hint="Le rendement annuel que vous souhaitez atteindre." />
          ) : (
            <EstimationInput key="price" id="estimation-price" label="Prix du bien" unit="CHF"
              value={values.price} onChange={set('price')} placeholder="Ex. 2000000"
              hint="Prix d'acquisition envisagé." />
          )}
        </fieldset>

        <section className="min-w-0 space-y-5 rounded-xl border border-primary/30 bg-card p-4 sm:p-6" aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-2 text-primary">
            <Calculator className="h-5 w-5" />
            <h2 className="font-heading font-semibold">{calculatingPrice ? 'Prix du bien estimé' : 'Rendement brut estimé'}</h2>
          </div>
          {result ? (
            <>
              <p className="break-words font-mono text-3xl font-bold text-primary">
                {calculatingPrice ? formatCHF(result.price) : formatPercent(result.grossYield)}
              </p>
              <p className="text-sm text-muted-foreground">
                {calculatingPrice
                  ? `Pour un rendement brut de ${formatPercent(result.grossYield)}.`
                  : `Pour un prix du bien de ${formatCHF(result.price)}.`}
              </p>
              <YieldIndicator grossYield={result.grossYield} />
              <dl className="space-y-3 border-t border-border pt-4 text-sm">
                <ResultLine label="Charges opérationnelles / an" value={formatCHF(result.charges)} />
                <ResultLine label="Revenu après charges / an" value={formatCHF(result.incomeAfterCharges)} />
                <ResultLine label="Rendement après charges" value={formatPercent(result.yieldAfterCharges)} />
              </dl>
              <p className="text-xs text-muted-foreground">Après charges opérationnelles uniquement, avant financement et impôts.</p>
              {createdProperty ? (
                <div className="space-y-3 rounded-lg bg-muted/50 p-3">
                  <p className="text-sm">Bien créé : <strong>{createdProperty.nom_bien}</strong> — {createdProperty.ville}. Vous pouvez reprendre son analyse ou démarrer une nouvelle estimation.</p>
                  {canContinue && (
                    <Button onClick={() => continueAnalysis(createdProperty)} className="w-full gap-2">
                      <ArrowRight className="h-4 w-4" />
                      {readEstimationDraft(userId, createdProperty.id)?.analysisId ? 'Voir l’analyse enregistrée' : 'Reprendre l’analyse'}
                    </Button>
                  )}
                </div>
              ) : canCreate && (
                <Button onClick={() => setDialogOpen(true)} className="h-auto min-h-12 w-full gap-2 whitespace-normal py-3">
                  <Plus className="h-4 w-4 shrink-0" /> Créer un bien et son analyse
                </Button>
              )}
            </>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">Renseignez les paramètres pour afficher votre estimation. Le résultat se met à jour automatiquement.</p>
          )}
          <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">Le calcul en toute simplicité</p>
            <p>{calculatingPrice ? 'Prix = revenu locatif annuel × 100 ÷ rendement brut (%)' : 'Rendement brut (%) = revenu locatif annuel ÷ prix × 100'}</p>
            <p>Le rendement brut est calculé avant charges. Les charges modifient le revenu et le rendement après charges affichés ci-dessus.</p>
          </div>
        </section>
      </div>
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!creationInFlight.current) setDialogOpen(open); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Créer le bien</DialogTitle>
            <DialogDescription>Renseignez le nom et la ville. Votre estimation sera reprise dans le formulaire d’analyse à compléter.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <fieldset disabled={createProperty.isPending} className="space-y-4">
              {[
                { key: 'nom_bien', label: 'Nom du bien *', placeholder: 'Ex. Résidence du Lac', required: true },
                { key: 'ville', label: 'Ville *', placeholder: 'Ex. Lausanne', required: true },
                { key: 'adresse', label: 'Adresse (facultatif)', placeholder: 'Rue et numéro' },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={`estimation-property-${field.key}`}>{field.label}</Label>
                  <Input id={`estimation-property-${field.key}`} value={propertyDetails[field.key]}
                    onChange={(event) => setPropertyDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                    required={field.required} placeholder={field.placeholder} className="h-12" />
                </div>
              ))}
            </fieldset>
            <p className="text-xs text-muted-foreground">
              {calculatingPrice ? 'Le prix calculé est un prix cible à confirmer avec le vendeur. ' : ''}
              Le bien sera créé maintenant ; l’analyse sera enregistrée après validation du formulaire suivant.
            </p>
            {creationError && <p role="alert" className="text-sm text-destructive">{creationError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={createProperty.isPending} onClick={() => setDialogOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={createProperty.isPending || !canCreate || !result || !propertyDetails.nom_bien.trim() || !propertyDetails.ville.trim()} className="gap-2">
                {createProperty.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {createProperty.isPending ? 'Création du bien…' : 'Continuer vers l’analyse'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function YieldIndicator({ grossYield }) {
  const indicator = grossYield < 4.5
    ? { icon: Frown, color: 'text-red-500', mood: 'Pas content', label: 'Rendement brut inférieur à 4,5 %', style: 'border-red-500/30 bg-red-500/10' }
    : grossYield > 5.5
      ? { icon: Smile, color: 'text-emerald-500', mood: 'Content', label: 'Rendement brut supérieur à 5,5 %', style: 'border-emerald-500/30 bg-emerald-500/10' }
      : { icon: Meh, color: 'text-orange-500', mood: 'Neutre', label: 'Rendement brut entre 4,5 % et 5,5 % inclus', style: 'border-orange-500/30 bg-orange-500/10' };
  const Icon = indicator.icon;

  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${indicator.style}`}>
      <Icon role="img" aria-label={indicator.mood} strokeWidth={1.75} className={`h-10 w-10 shrink-0 ${indicator.color}`} />
      <p className="text-sm font-medium">{indicator.label}</p>
    </div>
  );
}

function EstimationInput({ id, label, unit, value, onChange, placeholder, hint, max, allowZero = false }) {
  const number = parseEstimationNumber(value);
  const invalid = value.trim() !== '' && (number === null || (!allowZero && number <= 0) || (max !== undefined && number > max));
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type="text" inputMode="decimal" value={value} onChange={onChange}
          placeholder={placeholder} autoComplete="off" aria-invalid={invalid} aria-describedby={`${id}-help`}
          className={`h-12 bg-background pr-24 text-base ${invalid ? 'border-destructive' : 'border-border'}`} />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>
      </div>
      <p id={`${id}-help`} className={`text-xs ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>
        {invalid ? (max !== undefined ? `Saisissez un pourcentage entre 0 et ${max}.` : 'Saisissez un montant ou un taux supérieur à zéro.') : hint}
      </p>
    </div>
  );
}

function ResultLine({ label, value }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
    </div>
  );
}
