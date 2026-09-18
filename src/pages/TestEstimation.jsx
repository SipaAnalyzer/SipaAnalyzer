import { useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCHF, formatPercent } from '@/utils/calculations';
import { calculateQuickEstimation, parseEstimationNumber } from '@/utils/quickEstimation';

const INITIAL_VALUES = { rent: '', chargesPercent: '15', price: '', grossYield: '' };

export default function TestEstimation() {
  const [mode, setMode] = useState('price');
  const [values, setValues] = useState(INITIAL_VALUES);
  const result = calculateQuickEstimation({ mode, ...values });
  const calculatingPrice = mode === 'price';
  const set = (key) => (event) => setValues((current) => ({ ...current, [key]: event.target.value }));

  const reset = () => {
    setValues(INITIAL_VALUES);
    setMode('price');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Test estimation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Un prix ou un rendement, en quelques secondes.</p>
        </div>
        <Button variant="ghost" onClick={reset} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Réinitialiser
        </Button>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-medium">Que souhaitez-vous calculer ?</h2>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Scénario d'estimation">
          <Button variant={calculatingPrice ? 'default' : 'outline'} aria-pressed={calculatingPrice}
            onClick={() => setMode('price')} className="h-auto min-h-12 whitespace-normal py-3">
            Estimer le prix du bien
          </Button>
          <Button variant={!calculatingPrice ? 'default' : 'outline'} aria-pressed={!calculatingPrice}
            onClick={() => setMode('yield')} className="h-auto min-h-12 whitespace-normal py-3">
            Calculer le rendement brut
          </Button>
        </div>
      </section>

      <div className="grid items-start gap-6 md:grid-cols-2">
        <section className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-6">
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
        </section>

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
              <dl className="space-y-3 border-t border-border pt-4 text-sm">
                <ResultLine label="Charges opérationnelles / an" value={formatCHF(result.charges)} />
                <ResultLine label="Revenu après charges / an" value={formatCHF(result.incomeAfterCharges)} />
                <ResultLine label="Rendement après charges" value={formatPercent(result.yieldAfterCharges)} />
              </dl>
              <p className="text-xs text-muted-foreground">Après charges opérationnelles uniquement, avant financement et impôts.</p>
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
