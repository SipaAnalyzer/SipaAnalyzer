import { useState } from 'react';
import { calculateAnalysis, formatCHF, formatPercent } from '../utils/calculations';
import {
  getCustomFieldsAfter,
  getFinancialCustomFieldAmount,
  getFinancialCustomFieldsTotal,
  normalizeFinancialCustomFields,
} from '../utils/financialCustomFields';
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
  const customFields = normalizeFinancialCustomFields(analysis.financial_custom_fields, analysis.sipa_data);
  const prixTotal = Math.round(
    Number(analysis.prix_bien || 0) +
    Number(analysis.versement_initial || 0) +
    Number(analysis.amortissement_5_ans || 0) +
    Number(analysis.honoraires_transaction_sipa_group || 0) +
    Number(analysis.frais_dossier_bancaire || 0) +
    getFinancialCustomFieldsTotal(customFields, analysis)
  );
  const purchaseSubtotal = getPurchaseSubtotal(analysis);
  const adjustedAnalysis = {
    ...analysis,
    financial_custom_fields: customFields,
    prix_total: prixTotal,
    fonds_propres: Math.round(prixTotal - Number(analysis.hypotheque || 0)),
  };
  const adjustedCalc = calculateAnalysis(adjustedAnalysis);

  const revenuNet = Number(adjustedCalc.revenu_net || 0);
  const revenuDistribue = Number(adjustedCalc.revenu_distribue || 0);

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
              <FinancialTableBody analysis={adjustedAnalysis} calc={adjustedCalc} purchasePrice={purchasePrice} purchaseSubtotal={purchaseSubtotal} prixTotal={prixTotal} revenuNet={revenuNet} revenuDistribue={revenuDistribue} customFields={customFields} />
            </CollapsibleContent>
          ) : (
            <FinancialTableBody analysis={adjustedAnalysis} calc={adjustedCalc} purchasePrice={purchasePrice} purchaseSubtotal={purchaseSubtotal} prixTotal={prixTotal} revenuNet={revenuNet} revenuDistribue={revenuDistribue} customFields={customFields} />
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

function FinancialTableBody({ analysis, calc, purchasePrice, purchaseSubtotal, prixTotal, revenuNet, revenuDistribue, customFields }) {
  const renderCustomRows = (anchorKey) => getCustomFieldsAfter(customFields, anchorKey).map((field) => (
    <CustomFieldRow key={field.id} field={field} analysis={analysis} />
  ));
  const anchoredKeys = [
    'prix_bien',
    'prix_achat',
    'honoraires_sipa',
    'construction',
    'fonds_propres_achat',
    'amortissement_5_ans',
    'honoraires_transaction_sipa_group',
    'frais_dossier_bancaire',
    'prix_total',
    'fonds_propres',
    'versement_initial',
    'target_benefice_sipa_fonds_propres',
    'hypotheque',
    'revenus_locatifs',
    'rendement_brut',
    'charges_operationnelles',
    'interets_hypothecaires',
    'gestion',
    'revenu_net',
    'rendement_net_fonds_propres',
    'impot',
    'revenu_distribue',
    'revenu_distribue_fonds_propres',
  ];
  const unplacedCustomFields = customFields.filter((field) => !anchoredKeys.includes(field.insertAfter));

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
              {renderCustomRows('prix_bien')}
              <Row label="Prix d'achat" value={formatCHF(purchasePrice)} />
              {renderCustomRows('prix_achat')}
              <Row label="Construction" amount={analysis.construction} base={purchasePrice} />
              {renderCustomRows('construction')}
              <Row label="Fonds propres achat" value={formatCHF(getPurchaseEquity(analysis))} />
              {renderCustomRows('fonds_propres_achat')}
              <Row label="Versement initial sur le compte de la copropriété" value={formatCHF(analysis.versement_initial)} />
              {renderCustomRows('versement_initial')}
              <Row label="Amortissement sur 5 ans" value={formatCHF(analysis.amortissement_5_ans)} />
              {renderCustomRows('amortissement_5_ans')}
              <Row label="Honoraires de transaction SIPA" amount={analysis.honoraires_transaction_sipa_group} base={analysis.prix_bien} />
              {renderCustomRows('honoraires_transaction_sipa_group')}
              <Row label="Frais de dossier bancaire" value={formatCHF(analysis.frais_dossier_bancaire)} />
              {renderCustomRows('frais_dossier_bancaire')}
              <RowTotal label="Prix total d'acquisition" value={formatCHF(prixTotal)} />
              {renderCustomRows('prix_total')}
              <Row label="Fonds propres" value={formatCHF(analysis.fonds_propres)} />
              {renderCustomRows('fonds_propres')}
              <Row label="Objectif bénéfice SIPA sur fonds propres" amount={analysis.target_benefice_sipa_fonds_propres} />
              {renderCustomRows('target_benefice_sipa_fonds_propres')}
              <Row label="Hypothèque" amount={analysis.hypotheque} base={purchaseSubtotal} />
              {renderCustomRows('hypotheque')}
              <tr className="border-t-2 border-border">
                <Td className="text-muted-foreground">Revenus locatifs (hors charges)</Td>
                <Td className="text-right font-mono">{formatCHF(analysis.revenus_locatifs)}</Td>
              </tr>
              {renderCustomRows('revenus_locatifs')}
              <Row label="Taux de rendement brut" value={formatPercent(calc.rendement_brut)} muted />
              {renderCustomRows('rendement_brut')}
              <Row label="Charges opérationnelles" value={formatCHF(analysis.charges_operationnelles)} />
              {renderCustomRows('charges_operationnelles')}
              <Row label="Intérêt hypothécaire (Estimé en moyenne sur 5 ans)" amount={analysis.interets_hypothecaires} base={analysis.hypotheque} />
              {renderCustomRows('interets_hypothecaires')}
              <Row label="Honoraires de gestion" amount={analysis.gestion} base={analysis.revenus_locatifs} />
              {renderCustomRows('gestion')}
              <RowTotal label="Revenu net" value={formatCHF(revenuNet)} />
              {renderCustomRows('revenu_net')}
              <Row label="Rendement net sur fonds propres" value={formatPercent(calc.rendement_net_fonds_propres)} muted />
              {renderCustomRows('rendement_net_fonds_propres')}
              <Row label="Impôt" amount={analysis.impot} base={revenuNet} />
              {renderCustomRows('impot')}
              <RowTotal label="Revenu distribué" value={formatCHF(revenuDistribue)} />
              {renderCustomRows('revenu_distribue')}
              <Row
                label="Revenu distribué sur fonds propres"
                value={formatPercent(calc.revenu_distribue_fonds_propres)}
                muted
                footnote="Rendement estimatif basé sur un scénario projeté sur 5 ans"
              />
              {renderCustomRows('revenu_distribue_fonds_propres')}
              {unplacedCustomFields.length > 0 && (
                <tr className="border-t-2 border-dashed border-border/40">
                  <td colSpan={2} className="px-4 pt-3 pb-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Lignes personnalisées
                  </td>
                </tr>
              )}
              {unplacedCustomFields.map((cf, i) => {
                const amount = { value: getFinancialCustomFieldAmount(cf, analysis) };
                const pct = cf.pct == null ? null : { value: cf.pct };
                return (
                  <tr key={i}>
                    <Td>{cf.name}</Td>
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

function CustomFieldRow({ field, analysis }) {
  const amount = getFinancialCustomFieldAmount(field, analysis);
  const value = field.calculationFormula === 'ratio' ? formatPercent(amount) : formatCHF(amount);
  return (
    <tr className="border-dashed border-border/40">
      <Td>{field.name}</Td>
      <Td className="text-right font-mono">
        {value}
        {field.pct != null && <span className="ml-2 text-xs text-muted-foreground">({field.pct.toFixed(2)}%)</span>}
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
