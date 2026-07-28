import { useState } from 'react';
import { formatCHF, formatPercent } from '../utils/calculations';
import ExcelProjectionTables from './ExcelProjectionTables';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';

function Td({ children, className }) {
  return <td className={`py-2.5 px-4 ${className || ''}`}>{children}</td>;
}

function getPurchasePrice(analysis) {
  return analysis.prix_achat !== null && analysis.prix_achat !== undefined && analysis.prix_achat !== ''
    ? Number(analysis.prix_achat || 0)
    : Number(analysis.prix_bien || 0);
}

function getPurchaseSubtotal(analysis) {
  return (
    getPurchasePrice(analysis) +
    Number(analysis.honoraires_sipa || 0) +
    Number(analysis.construction || 0)
  );
}

function getPurchaseEquity(analysis) {
  if (analysis.fonds_propres_achat !== null && analysis.fonds_propres_achat !== undefined && analysis.fonds_propres_achat !== '') {
    return Number(analysis.fonds_propres_achat || 0);
  }
  return getPurchaseSubtotal(analysis) - Number(analysis.hypotheque || 0);
}

export default function FinancialTable({ analysis, collapsible = false }) {
  const [open, setOpen] = useState(true);

  if (!analysis) return null;

  const purchasePrice = getPurchasePrice(analysis);
  const prixTotal = Math.round(
    Number(analysis.prix_bien || 0) +
    Number(analysis.versement_initial || 0) +
    Number(analysis.amortissement_5_ans || 0) +
    Number(analysis.honoraires_transaction_sipa_group || 0) +
    Number(analysis.frais_dossier_bancaire || 0)
  );
  const purchaseSubtotal = getPurchaseSubtotal(analysis);

  const revenuNet = Number(analysis.revenu_net || 0);
  const revenuDistribue = Number(analysis.revenu_distribue || 0);

  const customFields = analysis.sipa_data
    ? analysis.sipa_data.filter((e) => e._custom)
    : [];

  return (
    <div className="space-y-6">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <h3 className="font-heading font-semibold">TABLEAU FINANCIER</h3>
            {collapsible && (
              <CollapsibleTrigger asChild>
                <Button type="button" variant="ghost" size="sm" className="gap-2">
                  {open ? 'Réduire' : 'Déplier'}
                  <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
            )}
          </div>
          {collapsible ? (
            <CollapsibleContent>
              <FinancialTableBody analysis={analysis} purchasePrice={purchasePrice} purchaseSubtotal={purchaseSubtotal} prixTotal={prixTotal} revenuNet={revenuNet} revenuDistribue={revenuDistribue} customFields={customFields} />
            </CollapsibleContent>
          ) : (
            <FinancialTableBody analysis={analysis} purchasePrice={purchasePrice} purchaseSubtotal={purchaseSubtotal} prixTotal={prixTotal} revenuNet={revenuNet} revenuDistribue={revenuDistribue} customFields={customFields} />
          )}
        </div>
      </Collapsible>

      <ExcelProjectionTables
        operatingProjection={analysis.operating_projection}
        capitalProjection={analysis.capital_projection}
        collapsible={collapsible}
      />
    </div>
  );
}

function FinancialTableBody({ analysis, purchasePrice, purchaseSubtotal, prixTotal, revenuNet, revenuDistribue, customFields }) {
  return (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Rubrique</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground w-48">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <Row label="Prix du bien" value={formatCHF(analysis.prix_bien)} />
              <Row label="Prix d'achat" value={formatCHF(purchasePrice)} />
              <Row label="Frais de transaction" amount={analysis.honoraires_sipa} base={purchasePrice} />
              <Row label="Construction" amount={analysis.construction} base={purchasePrice} />
              <Row label="Fonds propres achat" value={formatCHF(getPurchaseEquity(analysis))} />
              <Row label="Versement initial sur le compte de la copropriété" value={formatCHF(analysis.versement_initial)} />
              <Row label="Amortissement sur 5 ans" value={formatCHF(analysis.amortissement_5_ans)} />
              <Row label="Honoraires transaction SIPA Group" amount={analysis.honoraires_transaction_sipa_group} base={analysis.prix_bien} />
              <Row label="Frais de dossier bancaire" value={formatCHF(analysis.frais_dossier_bancaire)} />
              <RowTotal label="Prix total" value={formatCHF(prixTotal)} />
              <Row label="Fonds propres" value={formatCHF(analysis.fonds_propres)} />
              <Row label="Target bénéfice SIPA fonds propres" amount={analysis.target_benefice_sipa_fonds_propres} base={getPurchaseEquity(analysis)} />
              <Row label="Hypothèque" amount={analysis.hypotheque} base={purchaseSubtotal} />
              <tr className="border-t-2 border-border">
                <Td className="text-muted-foreground">Revenus locatifs (hors charges)</Td>
                <Td className="text-right font-mono">{formatCHF(analysis.revenus_locatifs)}</Td>
              </tr>
              <Row label="Taux de rendement brut" value={formatPercent(analysis.rendement_brut)} muted />
              <Row label="Charges opérationnelles" value={formatCHF(analysis.charges_operationnelles)} />
              <Row label="Intérêt hypothécaire (Estimé en moyenne sur 5 ans)" amount={analysis.interets_hypothecaires} base={analysis.hypotheque} />
              <Row label="Honoraires de gestion" amount={analysis.gestion} base={analysis.revenus_locatifs} />
              <RowTotal label="Revenu net" value={formatCHF(revenuNet)} />
              <Row label="Rendement net sur fonds propres" value={formatPercent(analysis.rendement_net_fonds_propres)} muted />
              <Row label="Impôt" amount={analysis.impot} base={revenuNet} />
              <RowTotal label="Revenu distribué" value={formatCHF(revenuDistribue)} />
              <Row
                label="Revenu distribué sur fonds propres"
                value={formatPercent(analysis.revenu_distribue_fonds_propres)}
                muted
                footnote="Rendement estimatif basé sur un scénario projeté sur 5 ans"
              />
              {customFields.length > 0 && (
                <tr className="border-t-2 border-dashed border-border/40">
                  <td colSpan={2} className="px-4 pt-3 pb-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Lignes personnalisées
                  </td>
                </tr>
              )}
              {customFields.map((cf, i) => {
                const amount = cf.values?.find((v) => v.type === 'amount');
                const pct = cf.values?.find((v) => v.type === 'pct');
                return (
                  <tr key={i}>
                    <Td>{cf.label}</Td>
                    <Td className="text-right font-mono">
                      {formatCHF(amount?.value)}
                      {pct?.value != null && <span className="ml-2 text-xs text-muted-foreground">({pct.value.toFixed(2)}%)</span>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
  );
}

function Row({ label, value, amount, base, muted, footnote }) {
  const pct = amount != null && base > 0 ? Math.round((amount / base) * 10000) / 100 : null;
  return (
    <tr>
      <Td className={muted ? 'text-muted-foreground' : ''}>
        {label}
        {footnote && <p className="text-[10px] text-muted-foreground mt-0.5">{footnote}</p>}
      </Td>
      <Td className="text-right font-mono">
        {value || formatCHF(amount)}
        {pct != null && <span className="ml-2 text-xs text-muted-foreground">({pct.toFixed(2)}%)</span>}
      </Td>
    </tr>
  );
}

function RowTotal({ label, value }) {
  return (
    <tr className="bg-primary/5 border-primary/20">
      <Td className="font-semibold text-primary">{label}</Td>
      <Td className="text-right font-mono font-bold text-primary">{value}</Td>
    </tr>
  );
}
