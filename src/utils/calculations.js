export function calculateAnalysis(data) {
  const prixBien = Number(data.prix_bien || 0);
  const revenusLocatifs = Number(data.revenus_locatifs || 0);
  const chargesOperationnelles = Number(data.charges_operationnelles || 0);
  const tauxHypothequePct =
    data.taux_hypotheque_pct !== undefined
      ? Number(data.taux_hypotheque_pct || 0)
      : prixBien > 0
        ? (Number(data.hypotheque || 0) / prixBien) * 100
        : 0;
  const tauxInteretHypothecairePct =
    data.taux_interet_hypothecaire_pct !== undefined
      ? Number(data.taux_interet_hypothecaire_pct || 0)
      : Number(data.banque_a_taux_hypothecaire || 0);
  const versementInitialPct =
    data.versement_initial_pct !== undefined
      ? Number(data.versement_initial_pct || 0)
      : 0;

  const honorairesPct =
    data.honoraires_transaction_pct !== undefined
      ? Number(data.honoraires_transaction_pct || 0)
      : prixBien > 0
        ? (Number(data.honoraires_sipa || 0) / prixBien) * 100
        : 0;

  const margePct =
    data.marge_beneficiaire_pct !== undefined
      ? Number(data.marge_beneficiaire_pct || 0)
      : prixBien > 0
        ? (Number(data.versement_copropriete || 0) / prixBien) * 100
        : 0;

  const honoraires_sipa = prixBien * (honorairesPct / 100);
  const marge_beneficiaire = prixBien * (margePct / 100);
  const prix_total = prixBien + honoraires_sipa + marge_beneficiaire;

  const amortissement_5_ans =
    data.amortissement_5_ans !== undefined
      ? Number(data.amortissement_5_ans || 0)
      : Number(data.amortissements || 0) * 5;

  const commission_broker_hypotheque =
    data.commission_broker_hypotheque !== undefined
      ? Number(data.commission_broker_hypotheque || 0)
      : Number(data.interets_hypothecaires || 0);

  const fraisGestionPct =
    data.frais_gestion_pct !== undefined
      ? Number(data.frais_gestion_pct || 0)
      : revenusLocatifs > 0
        ? (Number(data.gestion || 0) / revenusLocatifs) * 100
        : 0;

  const amortAutresPct =
    data.amort_autres_charges_pct !== undefined
      ? Number(data.amort_autres_charges_pct || 0)
      : revenusLocatifs > 0
        ? (Number(data.autres_couts || 0) / revenusLocatifs) * 100
        : 0;

  const gestion = revenusLocatifs * (fraisGestionPct / 100);
  const amort_autres_charges = revenusLocatifs * (amortAutresPct / 100);
  const autres_couts = commission_broker_hypotheque + amort_autres_charges;
  const amortissements = amortissement_5_ans / 5;
  const hypotheque = prixBien * (tauxHypothequePct / 100);
  const interets_hypothecaires = hypotheque * (tauxInteretHypothecairePct / 100);
  const versement_initial_spv = prix_total * (versementInitialPct / 100);
  const prix_total_investisseur = prix_total + amortissement_5_ans + versement_initial_spv;
  const fonds_propres_sur_prix_total = prix_total_investisseur - hypotheque;
  const fonds_propres_sur_prix_original = fonds_propres_sur_prix_total - prix_total;

  const revenu_net =
    revenusLocatifs -
    chargesOperationnelles -
    interets_hypothecaires -
    commission_broker_hypotheque -
    gestion -
    amort_autres_charges;

  const tauxImpotPct =
    data.taux_impot_pct !== undefined
      ? Number(data.taux_impot_pct || 0)
      : revenu_net > 0
        ? (Number(data.impot || 0) / revenu_net) * 100
        : 0;

  const impot = revenu_net > 0 ? revenu_net * (tauxImpotPct / 100) : 0;
  const rendement_brut = prixBien > 0 ? (revenusLocatifs / prixBien) * 100 : 0;
  const rendement_net_fp = fonds_propres_sur_prix_total > 0 ? (revenu_net / fonds_propres_sur_prix_total) * 100 : 0;
  const revenu_distribue = revenu_net - impot;
  const revenu_distribue_fp = fonds_propres_sur_prix_total > 0 ? (revenu_distribue / fonds_propres_sur_prix_total) * 100 : 0;

  const s1 = Math.min(Math.max(rendement_net_fp, 0) / 15 * 100, 100) * 0.35;
  const s2 = Math.min(Math.max(revenu_distribue_fp, 0) / 10 * 100, 100) * 0.25;
  const s3 = Math.min(Math.max(rendement_brut, 0) / 10 * 100, 100) * 0.20;
  const ltv = prixBien > 0 ? hypotheque / prixBien : 1;
  const s4 = Math.max(0, (1 - ltv / 0.8) * 100) * 0.10;
  const currentYear = new Date().getFullYear();
  const age = currentYear - (data.annee_construction || currentYear - 20);
  const s5 = Math.max(0, Math.min(100, 100 - age * 1.5)) * 0.10;
  const score = Math.round(Math.max(0, Math.min(100, s1 + s2 + s3 + s4 + s5)));
  const note = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'E';

  return {
    honoraires_sipa: Math.round(honoraires_sipa),
    versement_copropriete: Math.round(marge_beneficiaire),
    fonds_propres: Math.round(fonds_propres_sur_prix_total),
    hypotheque: Math.round(hypotheque),
    gestion: Math.round(gestion),
    amortissements: round2(amortissements),
    interets_hypothecaires: Math.round(interets_hypothecaires),
    autres_couts: Math.round(autres_couts),
    impot: Math.round(impot),
    marge_beneficiaire: Math.round(marge_beneficiaire),
    amortissement_5_ans: Math.round(amortissement_5_ans),
    commission_broker_hypotheque: Math.round(commission_broker_hypotheque),
    amort_autres_charges: Math.round(amort_autres_charges),
    versement_initial_spv: Math.round(versement_initial_spv),
    prix_total_investisseur: Math.round(prix_total_investisseur),
    fonds_propres_sur_prix_total: Math.round(fonds_propres_sur_prix_total),
    fonds_propres_sur_prix_original: Math.round(fonds_propres_sur_prix_original),
    prix_total: Math.round(prix_total),
    rendement_brut: round2(rendement_brut),
    revenu_net: Math.round(revenu_net),
    rendement_net_fonds_propres: round2(rendement_net_fp),
    revenu_distribue: Math.round(revenu_distribue),
    revenu_distribue_fonds_propres: round2(revenu_distribue_fp),
    score_global: score,
    note
  };
}

function round2(v) { return Math.round(v * 100) / 100; }

export function normalizeAnalysis(analysis) {
  if (!analysis) return analysis;
  const prixBien = Number(analysis.prix_bien || 0);
  const revenusLocatifs = Number(analysis.revenus_locatifs || 0);
  const hypotheque = Number(analysis.hypotheque || 0);
  const prixTotal = Number(analysis.prix_total || 0);
  const amortissement5Ans = Number(analysis.amortissements || 0) * 5;
  const versementInitial = Number(analysis.fonds_propres || 0) + hypotheque - prixTotal - amortissement5Ans;
  const revenuNetBase =
    revenusLocatifs -
    Number(analysis.charges_operationnelles || 0) -
    Number(analysis.interets_hypothecaires || 0) -
    Number(analysis.gestion || 0) -
    Number(analysis.autres_couts || 0);

  return {
    ...analysis,
    ...calculateAnalysis({
      ...analysis,
      honoraires_transaction_pct:
        prixBien > 0 ? (Number(analysis.honoraires_sipa || 0) / prixBien) * 100 : 0,
      marge_beneficiaire_pct:
        prixBien > 0 ? (Number(analysis.versement_copropriete || 0) / prixBien) * 100 : 0,
      taux_hypotheque_pct:
        prixBien > 0 ? (hypotheque / prixBien) * 100 : 0,
      taux_interet_hypothecaire_pct:
        hypotheque > 0 ? (Number(analysis.interets_hypothecaires || 0) / hypotheque) * 100 : 0,
      amortissement_5_ans: amortissement5Ans,
      versement_initial_pct:
        prixTotal > 0 ? (versementInitial / prixTotal) * 100 : 0,
      commission_broker_hypotheque: Number(analysis.autres_couts || 0),
      frais_gestion_pct:
        revenusLocatifs > 0 ? (Number(analysis.gestion || 0) / revenusLocatifs) * 100 : 0,
      taux_impot_pct:
        revenuNetBase > 0 ? (Number(analysis.impot || 0) / revenuNetBase) * 100 : 0,
      amort_autres_charges_pct: 0,
    }),
  };
}

export function normalizeAnalyses(analyses = []) {
  return analyses.map(normalizeAnalysis);
}

export function formatCHF(amount) {
  return new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(amount || 0);
}

export function formatPercent(value) {
  return `${(value || 0).toFixed(2)}%`;
}

export const STATUS_CONFIG = {
  brouillon: { label: 'Brouillon', class: 'bg-zinc-500/20 text-zinc-400' },
  en_cours: { label: 'En cours', class: 'bg-blue-500/20 text-blue-400' },
  valide: { label: 'Validé', class: 'bg-emerald-500/20 text-emerald-400' },
  abandonne: { label: 'Abandonné', class: 'bg-red-500/20 text-red-400' },
};

export const NOTE_CONFIG = {
  A: { class: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  B: { class: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  C: { class: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  D: { class: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  E: { class: 'bg-red-500/20 text-red-400 border-red-500/30' },
};
