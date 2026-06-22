import { formatCHF, formatPercent } from '../utils/calculations';

function safeNumber(value) {
  return Number(value || 0);
}

function DetailRow({ label, rate, value, highlight }) {
  return (
    <div className="grid grid-cols-12 gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="col-span-6 text-sm text-muted-foreground">
        {label}
      </div>

      <div className="col-span-2 text-right text-sm font-mono text-muted-foreground">
        {rate || ''}
      </div>

      <div
        className={`col-span-4 text-right text-sm font-mono font-semibold ${
          highlight ? 'text-primary' : 'text-foreground'
        }`}
      >
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
        <h3 className="font-heading font-semibold text-sm">
          {title}
        </h3>
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}

export default function PerformanceCharts({ analysis }) {
  if (!analysis) return null;

  const prixOriginal = safeNumber(analysis.prix_bien);
  const honorairesTransaction = safeNumber(analysis.honoraires_sipa);
  const margeBeneficiaire = safeNumber(analysis.versement_copropriete);
  const totalRevenueSipa = safeNumber(analysis.prix_total);

  const amortissement5Ans = safeNumber(analysis.amortissements) * 5;
  const versementInitialSpv = totalRevenueSipa * 0.02;
  const prixTotalInvestisseur = totalRevenueSipa + amortissement5Ans + versementInitialSpv;

  const fondsPropres = safeNumber(analysis.fonds_propres);
  const hypotheque = safeNumber(analysis.hypotheque);
  const interetsAnnuels = safeNumber(analysis.interets_hypothecaires);

  const revenusLocatifs = safeNumber(analysis.revenus_locatifs);
  const chargesOperationnelles = safeNumber(analysis.charges_operationnelles);
  const commissionBrokerEtAutres = safeNumber(analysis.autres_couts);
  const gestion = safeNumber(analysis.gestion);
  const amortissements = safeNumber(analysis.amortissements);
  const impot = safeNumber(analysis.impot);
  const revenuNet = safeNumber(analysis.revenu_net);
  const revenuDistribue = safeNumber(analysis.revenu_distribue);

  const rendementBrut = safeNumber(analysis.rendement_brut);
  const rendementNetFP = safeNumber(analysis.rendement_net_fonds_propres);
  const rendementDistribueFP = safeNumber(analysis.revenu_distribue_fonds_propres);

  const tauxHonoraires =
    prixOriginal > 0 ? (honorairesTransaction / prixOriginal) * 100 : 0;

  const tauxMarge =
    prixOriginal > 0 ? (margeBeneficiaire / prixOriginal) * 100 : 0;

  const tauxGestion =
    revenusLocatifs > 0 ? (gestion / revenusLocatifs) * 100 : 0;

  const tauxImpots =
    revenuNet > 0 ? (impot / revenuNet) * 100 : 0;

  const tauxHypothequeOriginal =
    prixOriginal > 0 ? (hypotheque / prixOriginal) * 100 : 0;

  const tauxInterets =
    hypotheque > 0 ? (interetsAnnuels / hypotheque) * 100 : 0;

  const fondsPropresSurPrixOriginal =
    analysis.fonds_propres_sur_prix_original !== undefined
      ? safeNumber(analysis.fonds_propres_sur_prix_original)
      : fondsPropres - totalRevenueSipa;

  const sipaRevenus = honorairesTransaction + margeBeneficiaire;
  const sipaRevenueSurFondsLeves =
    fondsPropresSurPrixOriginal !== 0
      ? (sipaRevenus / fondsPropresSurPrixOriginal) * 100
      : 0;

  const rendementNetPrixAchat =
    prixOriginal > 0 ? (revenusLocatifs / prixOriginal) * 100 : 0;

  return (
    <div className="space-y-4">
      <DetailSection number="1" title="Revenus SIPA Immobilier SA">
        <DetailRow label="Prix du bien original" value={formatCHF(prixOriginal)} />
        <DetailRow label="Honoraires transaction" rate={formatPercent(tauxHonoraires)} value={formatCHF(honorairesTransaction)} />
        <DetailRow label="Marge bénéficiaire" rate={formatPercent(tauxMarge)} value={formatCHF(margeBeneficiaire)} />
        <DetailRow label="Total Revenus SIPA" value={formatCHF(totalRevenueSipa)} highlight />
      </DetailSection>

      <DetailSection number="2" title="Analyse investisseurs">
        <DetailRow label="Revenus locatifs annuels" value={formatCHF(revenusLocatifs)} />
        <DetailRow label="Charges opérationnelles" value={formatCHF(chargesOperationnelles)} />
        <DetailRow label="Amortissement sur 5 ans" value={formatCHF(amortissement5Ans)} />
        <DetailRow label="Commission broker / autres charges" value={formatCHF(commissionBrokerEtAutres)} />
        <DetailRow label="Frais de gestion" rate={formatPercent(tauxGestion)} value={formatCHF(gestion)} />
        <DetailRow label="Taux d'impôt" rate={formatPercent(tauxImpots)} value={formatCHF(impot)} />
        <DetailRow label="Revenu net" value={formatCHF(revenuNet)} highlight />
        <DetailRow label="Revenu distribué" value={formatCHF(revenuDistribue)} highlight />
      </DetailSection>

      <DetailSection number="3" title="Financement hypothécaire">
        <DetailRow label="Hypothèque" rate={formatPercent(tauxHypothequeOriginal)} value={formatCHF(hypotheque)} />
        <DetailRow label="Intérêts annuels" rate={formatPercent(tauxInterets)} value={formatCHF(interetsAnnuels)} />
        <DetailRow label="Prix total investisseur" value={formatCHF(prixTotalInvestisseur)} highlight />
      </DetailSection>

      <DetailSection number="4" title="Récapitulatif fonds propres">
        <DetailRow label="Fonds propres sur prix total" value={formatCHF(fondsPropres)} highlight />
        <DetailRow label="Fonds propres sur prix original" value={formatCHF(fondsPropresSurPrixOriginal)} />
        <DetailRow label="Versement initial sur SPV" value={formatCHF(versementInitialSpv)} />
      </DetailSection>

      <DetailSection number="5" title="Indicateurs">
        <DetailRow label="Taux de rendement brut" value={formatPercent(rendementBrut)} />
        <DetailRow label="Amortissement annuel moyen" value={formatCHF(amortissements)} />
        <DetailRow label="Rendement net sur fonds propres" value={formatPercent(rendementNetFP)} highlight />
        <DetailRow label="Revenu distribué sur fonds propres" value={formatPercent(rendementDistribueFP)} highlight />
      </DetailSection>

      <DetailSection number="6" title="Récapitulatif">
        <DetailRow label="SIPA Immobilier SA - Revenus" value={formatCHF(sipaRevenus)} />
        <DetailRow label="SIPA Immobilier SA - Fonds propres" value={formatCHF(fondsPropresSurPrixOriginal)} />
        <DetailRow label="SIPA Revenue sur fonds levés" value={formatPercent(sipaRevenueSurFondsLeves)} />
        <DetailRow label="Rendement net sur prix d'achat" value={formatPercent(rendementNetPrixAchat)} highlight />
      </DetailSection>
    </div>
  );
}
