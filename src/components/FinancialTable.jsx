import { formatCHF, formatPercent } from '../utils/calculations';
import ExcelProjectionTables from './ExcelProjectionTables';

function Td({ children, className }) {
  return <td className={`py-2.5 px-4 ${className || ''}`}>{children}</td>;
}

export default function FinancialTable({ analysis }) {
  if (!analysis) return null;

  const prixTotal = Math.round(
    Number(analysis.prix_bien || 0) +
    Number(analysis.versement_initial || 0) +
    Number(analysis.amortissement_5_ans || 0) +
    Number(analysis.honoraires_sipa || 0) +
    Number(analysis.frais_dossier_bancaire || 0)
  );

  const revenuNet = Number(analysis.revenu_net || 0);
  const revenuDistribue = Number(analysis.revenu_distribue || 0);

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-heading font-semibold mb-5">TABLEAU FINANCIER</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-4 font-medium text-muted-foreground">Rubrique</th>
                <th className="text-right py-2 px-4 font-medium text-muted-foreground w-48">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              <Row label="Prix du bien" value={formatCHF(analysis.prix_bien)} />
              <Row label="Versement initial sur le compte de la copropriété" value={formatCHF(analysis.versement_initial)} />
              <Row label="Amortissement sur 5 ans" value={formatCHF(analysis.amortissement_5_ans)} />
              <Row label="Honoraires transaction Sipa Immobilier SA" amount={analysis.honoraires_sipa} base={analysis.prix_bien} />
              <Row label="Frais de dossier bancaire" value={formatCHF(analysis.frais_dossier_bancaire)} />
              <RowTotal label="Prix total" value={formatCHF(prixTotal)} />
              <Row label="Fonds propres" value={formatCHF(analysis.fonds_propres)} />
              <Row label="Hypothèque" amount={analysis.hypotheque} base={prixTotal} />
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
            </tbody>
          </table>
        </div>
      </div>

      <ExcelProjectionTables
        operatingProjection={analysis.operating_projection}
        capitalProjection={analysis.capital_projection}
      />
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
