import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { calculateAnalysis, formatCHF, formatPercent } from '../utils/calculations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ScoreGauge from './ScoreGauge';
import ScoreBadge from './ScoreBadge';
import { BarChart3, Building2, Calculator, DollarSign, Landmark, Percent, Save } from 'lucide-react';

function roundInput(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function Field({ label, value, onChange, prefix, suffix, readOnly }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label}
      </Label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {prefix}
          </span>
        )}

        <Input
          type="number"
          value={value ?? ''}
          onChange={(event) => onChange?.(parseFloat(event.target.value) || 0)}
          readOnly={readOnly}
          className={`bg-background border-border ${
            prefix ? 'pl-10' : ''
          } ${suffix ? 'pr-10' : ''} ${readOnly ? 'opacity-60' : ''}`}
        />

        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground mb-1.5 block">
        {label}
      </Label>

      <Textarea
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="bg-background border-border min-h-[90px]"
      />
    </div>
  );
}

function BankScenario({ title, description, color, values, setValue, prefix }) {
  return (
    <div className="bg-background/40 rounded-xl border border-border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div
          className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <Landmark className="h-4 w-4" />
        </div>

        <div>
          <h4 className="font-heading font-semibold text-sm">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Taux hypothécaire"
          value={values[`${prefix}_taux_hypothecaire`]}
          onChange={setValue(`${prefix}_taux_hypothecaire`)}
          suffix="%"
        />

        <Field
          label="Amortissement annuel"
          value={values[`${prefix}_amortissement_annuel`]}
          onChange={setValue(`${prefix}_amortissement_annuel`)}
          prefix="CHF"
        />
      </div>

      <TextField
        label="Évaluation"
        value={values[`${prefix}_evaluation`]}
        onChange={setValue(`${prefix}_evaluation`)}
        placeholder="Exemple : conditions favorables, risque de taux, exigences particulières de la banque..."
      />
    </div>
  );
}

function ResultRow({ label, value, highlight }) {
  return (
    <div
      className={`flex items-center justify-between gap-4 rounded-lg px-4 py-3 ${
        highlight
          ? 'bg-primary/15 border border-primary/30 text-primary'
          : 'bg-background/45 text-muted-foreground'
      }`}
    >
      <span className="text-sm font-medium">
        {label}
      </span>
      <span className="text-sm font-mono font-bold text-right text-foreground">
        {value}
      </span>
    </div>
  );
}

export default function AnalysisForm({
  initialData,
  initialPropertyId,
  onSubmit,
  isSubmitting,
}) {
  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 100),
  });

  const [form, setForm] = useState({
    property_id: initialPropertyId || '',

    prix_bien: 0,
    honoraires_transaction_pct: 5,
    marge_beneficiaire_pct: 15,

    taux_hypotheque_pct: 75,
    taux_interet_hypothecaire_pct: 1.61,
    versement_initial_pct: 2,
    amortization_years: 15,

    revenus_locatifs: 0,
    charges_operationnelles: 0,
    amortissement_5_ans: 0,
    commission_broker_hypotheque: 0,
    frais_gestion_pct: 4.25,
    taux_impot_pct: 13.79,
    amort_autres_charges_pct: 0,

    banque_a_taux_hypothecaire: 0,
    banque_a_amortissement_annuel: 0,
    banque_a_evaluation: '',

    banque_b_taux_hypothecaire: 0,
    banque_b_amortissement_annuel: 0,
    banque_b_evaluation: '',

    etat_batiment: '',
    emplacement_bien: '',

    statut: 'en_cours',
  });

  useEffect(() => {
    if (!initialData) return;

    const prixBien = Number(initialData.prix_bien || 0);
    const revenusLocatifs = Number(initialData.revenus_locatifs || 0);
    const revenuNet = Number(initialData.revenu_net || 0);
    const hypotheque = Number(initialData.hypotheque || 0);

    setForm((previous) => ({
      ...previous,
      ...initialData,
      honoraires_transaction_pct:
        prixBien > 0
          ? roundInput((Number(initialData.honoraires_sipa || 0) / prixBien) * 100)
          : previous.honoraires_transaction_pct,
      marge_beneficiaire_pct:
        prixBien > 0
          ? roundInput((Number(initialData.versement_copropriete || 0) / prixBien) * 100)
          : previous.marge_beneficiaire_pct,
      taux_hypotheque_pct:
        prixBien > 0
          ? roundInput((hypotheque / prixBien) * 100)
          : previous.taux_hypotheque_pct,
      taux_interet_hypothecaire_pct:
        hypotheque > 0
          ? roundInput((Number(initialData.interets_hypothecaires || 0) / hypotheque) * 100)
          : previous.taux_interet_hypothecaire_pct,
      amortissement_5_ans: Number(initialData.amortissements || 0) * 5,
      commission_broker_hypotheque: Number(initialData.autres_couts || 0),
      frais_gestion_pct:
        revenusLocatifs > 0
          ? roundInput((Number(initialData.gestion || 0) / revenusLocatifs) * 100)
          : previous.frais_gestion_pct,
      taux_impot_pct:
        revenuNet > 0
          ? roundInput((Number(initialData.impot || 0) / revenuNet) * 100)
          : previous.taux_impot_pct,
      amort_autres_charges_pct: 0,
    }));
  }, [initialData]);

  const set = (key) => (value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const selectedProperty = properties.find(
    (property) => property.id === form.property_id
  );

  const calc = useMemo(
    () =>
      calculateAnalysis({
        ...form,
        annee_construction: selectedProperty?.annee_construction,
      }),
    [form, selectedProperty]
  );

  const handleSubmit = () => {
    onSubmit({
      property_id: form.property_id,
      prix_bien: form.prix_bien,
      versement_copropriete: calc.versement_copropriete,
      honoraires_sipa: calc.honoraires_sipa,
      fonds_propres: calc.fonds_propres,
      hypotheque: calc.hypotheque,
      amortization_years: form.amortization_years,
      revenus_locatifs: form.revenus_locatifs,
      charges_operationnelles: form.charges_operationnelles,
      interets_hypothecaires: calc.interets_hypothecaires,
      gestion: calc.gestion,
      amortissements: calc.amortissements,
      autres_couts: calc.autres_couts,
      impot: calc.impot,
      banque_a_taux_hypothecaire: form.banque_a_taux_hypothecaire,
      banque_a_amortissement_annuel: form.banque_a_amortissement_annuel,
      banque_a_evaluation: form.banque_a_evaluation,
      banque_b_taux_hypothecaire: form.banque_b_taux_hypothecaire,
      banque_b_amortissement_annuel: form.banque_b_amortissement_annuel,
      banque_b_evaluation: form.banque_b_evaluation,
      ...(form.etat_batiment ? { etat_batiment: form.etat_batiment } : {}),
      ...(form.emplacement_bien ? { emplacement_bien: form.emplacement_bien } : {}),
      statut: form.statut,
      prix_total: calc.prix_total,
      rendement_brut: calc.rendement_brut,
      revenu_net: calc.revenu_net,
      rendement_net_fonds_propres: calc.rendement_net_fonds_propres,
      revenu_distribue: calc.revenu_distribue,
      revenu_distribue_fonds_propres: calc.revenu_distribue_fonds_propres,
      score_global: calc.score_global,
      note: calc.note,
    });
  };

  return (
    <div className="space-y-8">
      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" />
          Sélection du bien
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Bien immobilier
            </Label>

            <Select value={form.property_id} onValueChange={set('property_id')}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Sélectionner un bien" />
              </SelectTrigger>

              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.nom_bien} - {property.ville}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Statut
            </Label>

            <Select value={form.statut} onValueChange={set('statut')}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="en_cours">En cours</SelectItem>
                <SelectItem value="valide">Validé</SelectItem>
                <SelectItem value="abandonne">Abandonné</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              État du bâtiment
            </Label>
            <Select value={form.etat_batiment} onValueChange={set('etat_batiment')}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {['Excellent', 'Très bon', 'Bon', 'Moyen', 'Mauvais'].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Emplacement du bien
            </Label>
            <Select value={form.emplacement_bien} onValueChange={set('emplacement_bien')}>
              <SelectTrigger className="bg-background border-border">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {['Excellent', 'Très bon', 'Bon', 'Moyen', 'Mauvais'].map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Revenus SIPA Immobilier SA
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Prix du bien original"
            value={form.prix_bien}
            onChange={set('prix_bien')}
            prefix="CHF"
          />

          <Field
            label="Honoraires de transaction"
            value={form.honoraires_transaction_pct}
            onChange={set('honoraires_transaction_pct')}
            suffix="%"
          />

          <Field
            label="Marge bénéficiaire"
            value={form.marge_beneficiaire_pct}
            onChange={set('marge_beneficiaire_pct')}
            suffix="%"
          />
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <ResultRow label="Honoraires" value={formatCHF(calc.honoraires_sipa)} />
          <ResultRow label="Marge bénéficiaire" value={formatCHF(calc.marge_beneficiaire)} />
          <ResultRow
            label="Total Revenus SIPA"
            value={formatCHF(calc.prix_total)}
            highlight
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          Analyse investisseurs
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field
            label="Revenus locatifs annuels"
            value={form.revenus_locatifs}
            onChange={set('revenus_locatifs')}
            prefix="CHF"
          />

          <Field
            label="Charges opérationnelles"
            value={form.charges_operationnelles}
            onChange={set('charges_operationnelles')}
            prefix="CHF"
          />

          <Field
            label="Amortissement sur 5 ans"
            value={form.amortissement_5_ans}
            onChange={set('amortissement_5_ans')}
            prefix="CHF"
          />

          <Field
            label="Commission broker hypothèque"
            value={form.commission_broker_hypotheque}
            onChange={set('commission_broker_hypotheque')}
            prefix="CHF"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-border">
          <Field
            label="Frais de gestion"
            value={form.frais_gestion_pct}
            onChange={set('frais_gestion_pct')}
            suffix="%"
          />

          <Field
            label="Taux d'impôt"
            value={form.taux_impot_pct}
            onChange={set('taux_impot_pct')}
            suffix="%"
          />

          <Field
            label="Amort. / autres charges"
            value={form.amort_autres_charges_pct}
            onChange={set('amort_autres_charges_pct')}
            suffix="%"
          />
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <ResultRow label="Revenu net" value={formatCHF(calc.revenu_net)} />
          <ResultRow
            label="Revenu distribué"
            value={formatCHF(calc.revenu_distribue)}
            highlight
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Financement hypothécaire
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field
            label="Taux hypothèque (% du prix original)"
            value={form.taux_hypotheque_pct}
            onChange={set('taux_hypotheque_pct')}
            suffix="%"
          />

          <Field
            label="Taux d'intérêt hypothécaire"
            value={form.taux_interet_hypothecaire_pct}
            onChange={set('taux_interet_hypothecaire_pct')}
            suffix="%"
          />

          <Field
            label="Versement initial (% du prix total)"
            value={form.versement_initial_pct}
            onChange={set('versement_initial_pct')}
            suffix="%"
          />
        </div>

        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <ResultRow
            label={`Hypothèque (${formatPercent(form.taux_hypotheque_pct)})`}
            value={formatCHF(calc.hypotheque)}
          />
          <ResultRow label="Intérêts annuels" value={formatCHF(calc.interets_hypothecaires)} />
          <ResultRow
            label="Prix total investisseur"
            value={formatCHF(calc.prix_total_investisseur)}
            highlight
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5 flex items-center gap-2">
          <Percent className="h-4 w-4 text-primary" />
          Récapitulatif fonds propres
        </h3>

        <div className="space-y-2">
          <ResultRow
            label="Fonds propres sur prix total"
            value={formatCHF(calc.fonds_propres_sur_prix_total)}
            highlight
          />
          <ResultRow
            label="Fonds propres sur prix original"
            value={formatCHF(calc.fonds_propres_sur_prix_original)}
          />
          <ResultRow
            label="Versement initial sur SPV"
            value={formatCHF(calc.versement_initial_spv)}
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">
          Scénarios bancaires
        </h3>

        <p className="text-sm text-muted-foreground mb-5">
          Saisissez manuellement les conditions proposées par chaque banque.
        </p>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <BankScenario
            title="Banque A"
            description="Scénario A : conditions proposées par la première banque."
            color="#F59E0B"
            values={form}
            setValue={set}
            prefix="banque_a"
          />

          <BankScenario
            title="Banque B"
            description="Scénario B : conditions proposées par la deuxième banque."
            color="#10B981"
            values={form}
            setValue={set}
            prefix="banque_b"
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-primary/30 p-6">
        <h3 className="font-heading font-semibold mb-4 flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Résumé calculé
        </h3>

        <div className="flex flex-col lg:flex-row gap-6 items-start w-full">
          <div className="flex items-center gap-4">
            <ScoreGauge score={calc.score_global} size={100} />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">
                  Note
                </span>
                <ScoreBadge note={calc.note} />
              </div>

              <p className="text-xs text-muted-foreground">
                Score global
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 flex-1 min-w-0">
            <Metric label="Revenu net" value={formatCHF(calc.revenu_net)} />
            <Metric
              label="Rdt. net / FP"
              value={formatPercent(calc.rendement_net_fonds_propres)}
              highlight
            />
            <Metric
              label="Revenu distribué"
              value={formatCHF(calc.revenu_distribue)}
            />
            <Metric
              label="Rdt. distribué / FP"
              value={formatPercent(calc.revenu_distribue_fonds_propres)}
              highlight
            />
            <Metric
              label="Rendement brut"
              value={formatPercent(calc.rendement_brut)}
            />
            <Metric
              label="LTV"
              value={formatPercent(form.prix_bien > 0 ? (calc.hypotheque / form.prix_bien) * 100 : 0)}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!form.property_id || isSubmitting}
          className="gap-2"
        >
          <Save className="h-4 w-4" />
          {isSubmitting ? "Enregistrement..." : "Enregistrer l'analyse"}
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground truncate">
        {label}
      </p>
      <p
        className={`text-sm font-bold font-mono break-all ${
          highlight ? 'text-primary' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}
