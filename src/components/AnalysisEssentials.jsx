import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { recordAuditLog } from '@/utils/auditLogs';
import { formatCHF, formatPercent } from '@/utils/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Calculator, ArrowLeft, Save, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, XCircle, Home, TrendingUp, DollarSign, Percent
} from 'lucide-react';
import { toast } from 'sonner';

const FIELD_CONFIG = [
  { key: 'prix_bien', label: 'Prix d\'acquisition', unit: 'CHF', icon: DollarSign, step: 10000, defaultPct: null },
  { key: 'revenus_locatifs', label: 'Loyer annuel', unit: 'CHF', icon: Home, step: 5000, defaultPct: null },
  { key: 'charges_pct', label: 'Charges locatives', unit: '%', icon: Percent, step: 1, defaultPct: 15, max: 100 },
  { key: 'apport_pct', label: 'Apport personnel', unit: '%', icon: TrendingUp, step: 1, defaultPct: 30, max: 100 },
  { key: 'taux_hypotheque', label: 'Taux hypothécaire', unit: '%', icon: Calculator, step: 0.1, defaultPct: 2.7, max: 10 },
  { key: 'duree_pret', label: 'Durée du prêt', unit: 'ans', icon: Calculator, step: 1, defaultPct: 20, max: 30 },
  { key: 'frais_acquisition_pct', label: 'Frais d\'acquisition', unit: '%', icon: Percent, step: 0.1, defaultPct: 5, max: 15 },
  { key: 'travaux', label: 'Travaux / Rénovation', unit: 'CHF', icon: DollarSign, step: 10000, defaultPct: 0 },
];

const KPI_CONFIG = [
  { key: 'scoreGlobal', label: 'Score global', fmt: (v) => `${Math.round(v || 0)}/100`, icon: TrendingUp, thresholds: [60, 40] },
  { key: 'rendementNetFP', label: 'Rend. net/FP', fmt: formatPercent, icon: TrendingUp, thresholds: [5, 3] },
  { key: 'revenuDistribue', label: 'Cash-flow/an', fmt: formatCHF, icon: DollarSign, thresholds: [0, -10000] },
  { key: 'rendementBrut', label: 'Rend. brut', fmt: formatPercent, icon: Percent, thresholds: [5, 3] },
  { key: 'impot', label: 'Impôt estimé/an', fmt: formatCHF, icon: AlertCircle, thresholds: [0, -5000] },
];

function getStatusIcon(value, thresholds) {
  if (value >= (thresholds[0] || 0)) return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/30', label: 'Bon' };
  if (value >= (thresholds[1] || -Infinity)) return { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', label: 'Moyen' };
  return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/30', label: 'Faible' };
}

function parseNumber(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(/[^\d.,-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function formatInput(value, unit) {
  if (value === '' || value === null || value === undefined) return '';
  const n = parseNumber(value);
  if (unit === '%') return n.toFixed(n % 1 === 0 ? 0 : 1);
  if (unit === 'ans') return Math.round(n).toString();
  return new Intl.NumberFormat('fr-CH').format(Math.round(n));
}

export default function AnalysisEssentials({
  propertyId,
  property,
  initialData = {},
  onBack,
  onSwitchToFull,
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(() => {
    const defaults = {};
    FIELD_CONFIG.forEach((f) => {
      let val = initialData?.[f.key];
      if (val === undefined || val === null || val === '') {
        if (f.key === 'charges_pct') val = parseNumber(initialData?.charges_operationnelles) / parseNumber(initialData?.revenus_locatifs) * 100 || f.defaultPct;
        else if (f.key === 'apport_pct') val = f.defaultPct;
        else if (f.key === 'taux_hypotheque') val = f.defaultPct;
        else if (f.key === 'duree_pret') val = f.defaultPct;
        else if (f.key === 'frais_acquisition_pct') val = f.defaultPct;
        else if (f.key === 'travaux') val = f.defaultPct;
        else val = initialData?.[f.key] ?? '';
      }
      defaults[f.key] = val !== '' && val !== null && val !== undefined ? formatInput(val, f.unit) : '';
    });
    return defaults;
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [calculationDetail, setCalculationDetail] = useState(false);

  const computed = useMemo(() => {
    const prix = parseNumber(form.prix_bien);
    const loyer = parseNumber(form.revenus_locatifs);
    const chargesPct = parseNumber(form.charges_pct) / 100;
    const apportPct = parseNumber(form.apport_pct) / 100;
    const taux = parseNumber(form.taux_hypotheque) / 100;
    const duree = Math.round(parseNumber(form.duree_pret));
    const fraisPct = parseNumber(form.frais_acquisition_pct) / 100;
    const travaux = parseNumber(form.travaux);

    const charges = loyer * chargesPct;
    const fraisAcquisition = prix * fraisPct;
    const prixTotal = prix + fraisAcquisition + travaux;
    const apport = prix * apportPct;
    const hypotheque = Math.max(0, prixTotal - apport);

    const mensualite = taux > 0 && duree > 0
      ? hypotheque * (taux / 12) / (1 - Math.pow(1 + taux / 12, -duree * 12))
      : 0;
    const interetsAnnuels = hypotheque * taux;
    const amortissementAnnuel = hypotheque / duree;

    const revenuNet = loyer - charges - interetsAnnuels;
    const impot = Math.max(0, revenuNet * 0.2);
    const revenuDistribue = revenuNet - impot;

    const rendementBrut = prix > 0 ? (loyer / prix) * 100 : 0;
    const rendementNetFP = apport > 0 ? (revenuDistribue / apport) * 100 : 0;
    const scoreRendementBrut = rendementBrut <= 4
      ? rendementBrut / 4 * 60
      : 60 + (rendementBrut - 4) / 4 * 25;
    const scoreRendementNetFP = Math.min(Math.max(rendementNetFP / 15 * 5, 0), 5);
    const scoreGlobal = Math.min(100, Math.max(0, scoreRendementBrut + scoreRendementNetFP + 15 + 5));

    return {
      prix, loyer, charges, chargesPct, apport, apportPct, taux, duree, fraisAcquisition, fraisPct, travaux,
      prixTotal, hypotheque, mensualite, interetsAnnuels, amortissementAnnuel,
      revenuNet, impot, revenuDistribue, rendementBrut, rendementNetFP, scoreGlobal,
    };
  }, [form]);

  const kpis = useMemo(() => KPI_CONFIG.map((k) => {
    const val = computed[k.key];
    const status = getStatusIcon(val, k.thresholds);
    return { ...k, value: val, formatted: k.fmt(val), status };
  }), [computed]);

  const create = useMutation({
    mutationFn: (payload) => base44.entities.Analysis.create(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['analyses'] });
      queryClient.invalidateQueries({ queryKey: ['nav-alert-analyses'] });
      toast.success('Analyse enregistrée');
      recordAuditLog({ eventType: 'analysis_created', targetType: 'analysis', targetId: result.id, targetLabel: `Analyse #${result.id?.slice(0, 8)}`, metadata: { property_id: result.property_id } }).catch(() => {});
      navigate(`/property/${result.property_id}`);
    },
    onError: (error) => toast.error(error?.message || "Erreur à l'enregistrement"),
  });

  const handleSubmit = () => {
    const payload = {
      property_id: propertyId,
      statut: 'en_cours',
      prix_bien: computed.prix,
      prix_achat: computed.prix,
      versement_initial: computed.fraisAcquisition + computed.travaux,
      honoraires_transaction_sipa_group: computed.fraisAcquisition * 0.5,
      construction: computed.travaux,
      frais_dossier_bancaire: computed.fraisAcquisition * 0.1,
      fonds_propres: computed.apport,
      hypotheque: computed.hypotheque,
      revenus_locatifs: computed.loyer,
      charges_operationnelles: computed.charges,
      interets_hypothecaires: Math.round(computed.interetsAnnuels),
      impot: Math.round(computed.impot),
      banque_a_taux_hypotheque: computed.taux,
      banque_a_type_taux: 'fixe',
      banque_a_amortissement_annuel: Math.round(computed.amortissementAnnuel),
    };
    create.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="font-display text-2xl font-bold">Analyse essentielle</h1>
          <p className="text-sm text-muted-foreground">{property?.nom_bien} — {property?.ville}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)} className="gap-2">
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAdvanced ? 'Masquer' : 'Affiner'}
          </Button>
          <Button variant="outline" onClick={onSwitchToFull} className="gap-2">
            Version complète
          </Button>
        </div>
      </div>

      {showAdvanced && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium">Mode détaillé activé — tous les champs sont accessibles.</p>
          <Button variant="outline" size="sm" onClick={onSwitchToFull} className="mt-2 gap-2">
            Ouvrir la version complète (onglets, SIPA, projections…)
          </Button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6 min-w-0">
          <h2 className="font-heading font-semibold flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" /> Paramètres
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELD_CONFIG.map((field) => (
              <EssentialsInput
                key={field.key}
                field={field}
                value={form[field.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, [field.key]: v }))}
                computed={computed}
              />
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-24 space-y-4 min-w-0">
          <section className="rounded-xl border border-primary/30 bg-card p-4 sm:p-6">
            <div className="flex items-center gap-2 text-primary mb-4">
              <TrendingUp className="h-5 w-5" />
              <h2 className="font-heading font-semibold">Résultats</h2>
            </div>
            <div className="space-y-3">
              {kpis.map((kpi) => (
                <KpiCard key={kpi.key} kpi={kpi} detail={calculationDetail && kpi.key === 'rendement_net_fonds_propres'} computed={computed} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <Button variant="ghost" size="sm" onClick={() => setCalculationDetail(!calculationDetail)} className="w-full gap-2 justify-start">
                {calculationDetail ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {calculationDetail ? 'Masquer' : 'Détail'} du calcul
              </Button>
              {calculationDetail && (
                <CalculationDetail computed={computed} form={form} />
              )}
            </div>
          </section>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onBack} className="flex-1">Annuler</Button>
            <Button onClick={handleSubmit} disabled={create.isPending} className="flex-1 gap-2">
              {create.isPending && <Save className="h-4 w-4 animate-spin" />}
              {create.isPending ? 'Enregistrement…' : 'Enregistrer l\'analyse'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EssentialsInput({ field, value, onChange, computed }) {
  const isPct = field.unit === '%';
  const isYears = field.unit === 'ans';
  const displayValue = value === '' ? '' : value;
  const invalid = displayValue !== '' && (isNaN(parseNumber(displayValue)) ||
    (field.max !== undefined && parseNumber(displayValue) > field.max) ||
    (field.key === 'apport_pct' && parseNumber(displayValue) > 100) ||
    (field.key === 'charges_pct' && parseNumber(displayValue) > 100));

  const hint = field.key === 'charges_pct' ? `≈ ${formatCHF(computed.charges)}/an` :
    field.key === 'apport_pct' ? `≈ ${formatCHF(computed.apport)}` :
    field.key === 'taux_hypotheque' ? `≈ ${formatCHF(Math.round(computed.interetsAnnuels))} intérêt/an` :
    field.key === 'frais_acquisition_pct' ? `≈ ${formatCHF(computed.fraisAcquisition)}` :
    field.key === 'travaux' ? 'Montant des rénovations' : '';

  return (
    <div className={`space-y-2 ${isPct || isYears ? 'sm:col-span-1' : ''}`}>
      <Label className="flex items-center gap-1.5">
        <field.icon className="h-3.5 w-3.5 text-muted-foreground" />
        {field.label}
      </Label>
      <div className="relative">
        <Input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.defaultPct ? `Défaut: ${field.defaultPct}${field.unit}` : ''}
          className={`h-12 bg-background text-base pr-16 ${invalid ? 'border-destructive' : 'border-border'}`}
          aria-invalid={invalid}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
          {field.unit}
        </span>
      </div>
      <p className={`text-xs ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>
        {invalid ? 'Valeur invalide' : hint}
      </p>
    </div>
  );
}

function KpiCard({ kpi, detail, computed }) {
  const { icon: Icon, color, bg, label: statusLabel } = kpi.status;
  return (
    <div className={`flex items-center gap-3 rounded-lg border p-3 ${bg}`}>
      <Icon className={`h-5 w-5 shrink-0 ${color}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
        <p className="font-mono font-bold text-lg">{kpi.formatted}</p>
        {detail && kpi.key === 'rendement_net_fonds_propres' && (
          <p className="text-xs text-muted-foreground mt-1">
            (Revenu net − impôt) / Apport = {formatCHF(computed.revenuDistribue)} / {formatCHF(computed.apport)}
          </p>
        )}
      </div>
      <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded ${color} bg-transparent`}>
        {statusLabel}
      </span>
    </div>
  );
}

function CalculationDetail({ computed, form }) {
  return (
    <div className="mt-3 space-y-2 text-xs text-muted-foreground font-mono bg-muted/50 rounded p-3">
      <p><strong>Prix total :</strong> {formatCHF(computed.prixTotal)} (prix + frais {formatCHF(computed.fraisAcquisition)} + travaux {formatCHF(computed.travaux)})</p>
      <p><strong>Apport :</strong> {formatCHF(computed.apport)} ({Math.round(computed.apportPct * 100)} %)</p>
      <p><strong>Emprunt :</strong> {formatCHF(computed.hypotheque)} @ {computed.taux.toFixed(1)} % sur {computed.duree} ans</p>
      <p><strong>Mensualité :</strong> {formatCHF(computed.mensualite)} → Intérêt/an {formatCHF(Math.round(computed.interetsAnnuels))} + Amort. {formatCHF(Math.round(computed.amortissementAnnuel))}</p>
      <p><strong>Loyer :</strong> {formatCHF(computed.loyer)} − Charges {formatCHF(computed.charges)} ({Math.round(computed.chargesPct * 100)} %) = {formatCHF(computed.loyer - computed.charges)}</p>
      <p><strong>Revenu net :</strong> {formatCHF(computed.revenuNet)} − Impôt {formatCHF(computed.impot)} = {formatCHF(computed.revenuDistribue)}</p>
      <p><strong>Rendement net/FP :</strong> {formatCHF(computed.revenuDistribue)} / {formatCHF(computed.apport)} = {formatPercent(computed.rendementNetFP)}</p>
      <p><strong>Score global :</strong> {Math.round(computed.scoreGlobal)}/100</p>
    </div>
  );
}