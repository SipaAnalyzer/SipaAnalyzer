import { formatCHF, formatPercent } from '../utils/calculations';

function safeNumber(value) {
  return Number(value || 0);
}

function DetailRow({ label, value, highlight, indent }) {
  return (
    <div className="grid grid-cols-2 gap-3 py-2 border-b border-border/40 last:border-0">
      <div className={`text-sm ${indent ? 'text-muted-foreground pl-4' : 'text-muted-foreground'}`}>
        {label}
      </div>
      <div className={`text-right text-sm font-mono font-semibold ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}

function DetailSection({ number, title, children }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-7 w-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
          {number}
        </div>
        <h3 className="font-heading font-semibold text-sm">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function PerformanceCharts({ analysis }) {
  if (!analysis) return null;

  const prixBien = safeNumber(analysis.prix_bien);
  const versementInitial = safeNumber(analysis.versement_initial);
  const amortissement5Ans = safeNumber(analysis.amortissement_5_ans);
  const honorairesSipa = safeNumber(analysis.honoraires_sipa);
  const fraisDossierBancaire = safeNumber(analysis.frais_dossier_bancaire);
  const prixTotal = safeNumber(analysis.prix_total);
  const fondsPropres = safeNumber(analysis.fonds_propres);
  const hypotheque = safeNumber(analysis.hypotheque);

  const revenusLocatifs = safeNumber(analysis.revenus_locatifs);
  const chargesOperationnelles = safeNumber(analysis.charges_operationnelles);
  const interetsHypothecaires = safeNumber(analysis.interets_hypothecaires);
  const gestion = safeNumber(analysis.gestion);
  const impot = safeNumber(analysis.impot);

  return (
    <div className="space-y-4">
      <DetailSection number="1" title="Acquisition — Prix total">
        <DetailRow label="Prix du bien" value={formatCHF(prixBien)} />
        <DetailRow label="Versement initial copropriété" value={formatCHF(versementInitial)} />
        <DetailRow label="Amortissement sur 5 ans" value={formatCHF(amortissement5Ans)} />
        <DetailRow label="Honoraires Sipa Immobilier SA" value={formatCHF(honorairesSipa)} />
        <DetailRow label="Frais de dossier bancaire" value={formatCHF(fraisDossierBancaire)} />
        <DetailRow label="Prix total" value={formatCHF(prixTotal)} highlight />
      </DetailSection>

      <DetailSection number="2" title="Financement">
        <DetailRow label="Fonds propres" value={formatCHF(fondsPropres)} />
        <DetailRow label="Hypothèque" value={formatCHF(hypotheque)} />
        <DetailRow label="Prix total" value={formatCHF(prixTotal)} highlight />
      </DetailSection>

      <DetailSection number="3" title="Résultat locatif">
        <DetailRow label="Revenus locatifs (hors charges)" value={formatCHF(revenusLocatifs)} />
        <DetailRow label="Charges opérationnelles" value={formatCHF(chargesOperationnelles)} indent />
        <DetailRow label="Intérêt hypothécaire (moy. 5 ans)" value={formatCHF(interetsHypothecaires)} indent />
        <DetailRow label="Honoraires de gestion" value={formatCHF(gestion)} indent />
        <DetailRow label="Revenu net" value={formatCHF(analysis.revenu_net)} highlight />
        <DetailRow label="Impôt" value={formatCHF(impot)} indent />
        <DetailRow label="Revenu distribué" value={formatCHF(analysis.revenu_distribue)} highlight />
      </DetailSection>

      <DetailSection number="4" title="Indicateurs de performance">
        <DetailRow label="Rendement brut" value={formatPercent(analysis.rendement_brut)} />
        <DetailRow label="Rendement net / fonds propres" value={formatPercent(analysis.rendement_net_fonds_propres)} highlight />
        <DetailRow label="Revenu distribué / fonds propres" value={formatPercent(analysis.revenu_distribue_fonds_propres)} highlight />
        <DetailRow label="Score global" value={`${analysis.score_global}/100 (${analysis.note || 'N/A'})`} highlight />
      </DetailSection>
    </div>
  );
}
