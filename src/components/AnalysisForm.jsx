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
import { Calculator, Save, Building2, Landmark } from 'lucide-react';

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
          onChange={(event) => onChange(parseFloat(event.target.value) || 0)}
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
    versement_copropriete: 0,
    honoraires_sipa: 0,

    fonds_propres: 0,
    hypotheque: 0,
    amortization_years: 15,

    revenus_locatifs: 0,

    charges_operationnelles: 0,
    interets_hypothecaires: 0,
    gestion: 0,
    amortissements: 0,
    autres_couts: 0,
    impot: 0,

    banque_a_taux_hypothecaire: 0,
    banque_a_amortissement_annuel: 0,
    banque_a_evaluation: '',

    banque_b_taux_hypothecaire: 0,
    banque_b_amortissement_annuel: 0,
    banque_b_evaluation: '',

    statut: 'en_cours',
  });

  useEffect(() => {
    if (initialData) {
      setForm((previous) => ({
        ...previous,
        ...initialData,
      }));
    }
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
      ...form,
      ...calc,
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
                    {property.nom_bien} — {property.ville}
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
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">
          Acquisition
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field
            label="Prix du bien"
            value={form.prix_bien}
            onChange={set('prix_bien')}
            prefix="CHF"
          />

          <Field
            label="Versement copropriété"
            value={form.versement_copropriete}
            onChange={set('versement_copropriete')}
            prefix="CHF"
          />

          <Field
            label="Honoraires SIPA"
            value={form.honoraires_sipa}
            onChange={set('honoraires_sipa')}
            prefix="CHF"
          />

          <Field
            label="Prix total"
            value={calc.prix_total}
            readOnly
            prefix="CHF"
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">
          Financement
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Fonds propres"
            value={form.fonds_propres}
            onChange={set('fonds_propres')}
            prefix="CHF"
          />

          <Field
            label="Hypothèque"
            value={form.hypotheque}
            onChange={set('hypotheque')}
            prefix="CHF"
          />

          <Field
            label="Années d'amortissement"
            value={form.amortization_years}
            onChange={set('amortization_years')}
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

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">
          Revenus
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field
            label="Revenus locatifs annuels"
            value={form.revenus_locatifs}
            onChange={set('revenus_locatifs')}
            prefix="CHF"
          />

          <Field
            label="Rendement brut"
            value={calc.rendement_brut}
            readOnly
            suffix="%"
          />
        </div>
      </section>

      <section className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-4">
          Charges
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field
            label="Charges opérationnelles"
            value={form.charges_operationnelles}
            onChange={set('charges_operationnelles')}
            prefix="CHF"
          />

          <Field
            label="Intérêts hypothécaires"
            value={form.interets_hypothecaires}
            onChange={set('interets_hypothecaires')}
            prefix="CHF"
          />

          <Field
            label="Gestion"
            value={form.gestion}
            onChange={set('gestion')}
            prefix="CHF"
          />

          <Field
            label="Amortissements"
            value={form.amortissements}
            onChange={set('amortissements')}
            prefix="CHF"
          />

          <Field
            label="Autres coûts"
            value={form.autres_couts}
            onChange={set('autres_couts')}
            prefix="CHF"
          />

          <Field
            label="Impôt"
            value={form.impot}
            onChange={set('impot')}
            prefix="CHF"
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
              value={formatPercent(
                calc.prix_total > 0
                  ? (form.hypotheque / calc.prix_total) * 100
                  : 0
              )}
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