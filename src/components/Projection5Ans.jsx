import { useState, useMemo, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCHF } from '../utils/calculations';
import { fetchSaronRate } from '../utils/saronRate';
import { Loader2 } from 'lucide-react';

function BankInputs({ name, color, state, setState, hypo, prixTotal, saronRate, saronLoading }) {
  const borderClass = color === 'amber' ? 'border-amber-500/25' : 'border-emerald-500/25';
  const bgClass = color === 'amber' ? 'bg-amber-500/5' : 'bg-emerald-500/5';
  const textClass = color === 'amber' ? 'text-amber-400' : 'text-emerald-400';

  const rateType = state.rateType || 'fixe';
  const tauxSaisi = state.taux;
  const marge = state.marge ?? 0.5;

  const effectiveRate = useMemo(() => {
    if (rateType === 'fixe') return tauxSaisi;
    const saron = saronRate ?? 0;
    if (rateType === 'saron') return saron + marge;
    if (rateType === 'mixte') return (tauxSaisi ?? 0) + saron;
    return tauxSaisi;
  }, [rateType, tauxSaisi, marge, saronRate]);

  const handleTaux = (v) => {
    setState((prev) => ({ ...prev, taux: v }));
  };

  const handleAmort = (v) => {
    setState((prev) => ({ ...prev, amort: v }));
  };

  const handleDuree = (v) => {
    setState((prev) => ({ ...prev, duree: v }));
  };

  const handleEvalPct = (v) => {
    setState((prev) => {
      const next = { ...prev, evalPct: v };
      if (v != null && v > 0 && prixTotal > 0) next.evalMontant = Math.round(prixTotal * v / 100);
      return next;
    });
  };

  const handleEvalMontant = (v) => {
    setState((prev) => {
      const next = { ...prev, evalMontant: v };
      if (v != null && v > 0 && prixTotal > 0) next.evalPct = Math.round((v / prixTotal) * 10000) / 100;
      return next;
    });
  };

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-5`}>
      <h4 className={`font-semibold mb-4 ${textClass}`}>{name}</h4>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Évaluation du bien</Label>
          <div className="flex gap-2 items-center">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
              <Input
                type="number"
                value={state.evalMontant ?? ''}
                onChange={(e) => handleEvalMontant(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                className="bg-background border-border pl-10"
              />
            </div>
            <div className="relative w-24 shrink-0">
              <Input
                type="number"
                value={state.evalPct ?? ''}
                onChange={(e) => handleEvalPct(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                className="bg-background border-border pr-8 text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">du prix total</p>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Type de taux</Label>
          <Select
            value={rateType}
            onValueChange={(v) => setState((prev) => ({ ...prev, rateType: v }))}
          >
            <SelectTrigger className="bg-background border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixe">Taux fixe</SelectItem>
              <SelectItem value="saron">Saron</SelectItem>
              <SelectItem value="mixte">Base fixe + Saron</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {rateType === 'fixe' && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Taux hypothécaire</Label>
            <div className="relative">
              <Input
                type="number"
                value={state.taux ?? ''}
                onChange={(e) => handleTaux(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                className="bg-background border-border pr-8 text-right"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </div>
        )}

        {rateType === 'saron' && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Taux SARON actuel</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={saronRate != null ? saronRate.toFixed(3) : ''}
                  readOnly
                  className="bg-muted/50 border-border pr-8 text-right opacity-70"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                {saronLoading && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Marge</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={state.marge ?? 0.5}
                  onChange={(e) => setState((prev) => ({ ...prev, marge: parseFloat(e.target.value) || 0 }))}
                  className="bg-background border-border pr-8 text-right"
                  step="0.05"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
          </>
        )}

        {rateType === 'mixte' && (
          <>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Base fixe</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={state.taux ?? ''}
                  onChange={(e) => handleTaux(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
                  className="bg-background border-border pr-8 text-right"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Indexation SARON</Label>
              <div className="relative">
                <Input
                  type="number"
                  value={saronRate != null ? `${saronRate >= 0 ? '+' : ''}${saronRate.toFixed(3)}` : ''}
                  readOnly
                  className="bg-muted/50 border-border pr-8 text-right opacity-70"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                {saronLoading && <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
            </div>
          </>
        )}

        {(rateType === 'saron' || rateType === 'mixte') && effectiveRate != null && (
          <div className="pt-1">
            <div className="rounded-lg bg-background/60 border border-border/60 px-3 py-2 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Taux effectif</span>
              <span className={`font-mono font-bold text-sm ${textClass}`}>
                {effectiveRate.toFixed(3)}%
              </span>
            </div>
          </div>
        )}

        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Durée</Label>
          <div className="relative">
            <Input
              type="number"
              value={state.duree ?? ''}
              onChange={(e) => handleDuree(e.target.value === '' ? null : Math.round(parseFloat(e.target.value)) || 0)}
              className="bg-background border-border pr-8 text-right"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">ans</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Amortissement annuel</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
            <Input
              type="number"
              value={state.amort ?? ''}
              onChange={(e) => handleAmort(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              className="bg-background border-border pl-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectionTable({ label, color, data, outflows }) {
  const textClass = color === 'amber' ? 'text-amber-400' : 'text-emerald-400';
  const borderClass = color === 'amber' ? 'border-amber-500/25' : 'border-emerald-500/25';

  return (
    <div className={`rounded-xl border ${borderClass} overflow-hidden flex-1`}>
      <div className={`${color === 'amber' ? 'bg-amber-500/10' : 'bg-emerald-500/10'} px-4 py-2.5 border-b ${borderClass}`}>
        <span className={`font-semibold text-sm ${textClass}`}>{label}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/50">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground text-[11px]">Année</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground text-[11px]">Intérêts</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground text-[11px]">Amort.</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground text-[11px]">Solde</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground text-[11px]">Cash-flow</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30">
          {data.map((row) => {
            const cf = outflows - row.interest - row.amortissement;
            return (
              <tr key={row.year}>
                <td className="py-2 px-3 text-muted-foreground">{row.year}</td>
                <td className={`py-2 px-3 text-right font-mono ${textClass}`}>{formatCHF(row.interest)}</td>
                <td className="py-2 px-3 text-right font-mono">{formatCHF(row.amortissement)}</td>
                <td className="py-2 px-3 text-right font-mono">{formatCHF(row.remaining)}</td>
                <td className={`py-2 px-3 text-right font-mono ${cf >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCHF(cf)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Projection5Ans({ analysis }) {
  const hypo = Number(analysis?.hypotheque || 0);
  const prixBien = Number(analysis?.prix_bien || 0);
  const prixTotal = Math.round(prixBien
    + Number(analysis?.versement_initial || 0)
    + Number(analysis?.amortissement_5_ans || 0)
    + Number(analysis?.honoraires_sipa || 0)
    + Number(analysis?.frais_dossier_bancaire || 0));
  const defaultDuree = 5;
  const defaultRateA = analysis?.banque_a_taux_hypothecaire
    ?? (analysis?.interets_hypothecaires && hypo > 0 ? Math.round((analysis.interets_hypothecaires / hypo) * 10000) / 100 : null);
  const defaultRateB = analysis?.banque_b_taux_hypothecaire
    ?? (analysis?.interets_hypothecaires && hypo > 0 ? Math.round((analysis.interets_hypothecaires / hypo) * 10000) / 100 : null);
  const defaultAmort = hypo > 0
    ? (analysis?.amortissement_5_ans ? Math.round(analysis.amortissement_5_ans / defaultDuree) : Math.round(hypo / defaultDuree))
    : 0;
  const [saronRate, setSaronRate] = useState(null);
  const [saronLoading, setSaronLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSaronLoading(true);
    fetchSaronRate().then((rate) => {
      if (!cancelled) {
        setSaronRate(rate);
        setSaronLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  const [bankA, setBankA] = useState(() => ({
    rateType: 'fixe',
    taux: defaultRateA,
    marge: 0.5,
    duree: defaultDuree,
    amort: analysis?.banque_a_amortissement_annuel ?? defaultAmort,
    evalPct: null,
    evalMontant: null,
  }));

  const [bankB, setBankB] = useState(() => ({
    rateType: 'fixe',
    taux: defaultRateB,
    marge: 0.5,
    duree: defaultDuree,
    amort: analysis?.banque_b_amortissement_annuel ?? defaultAmort,
    evalPct: null,
    evalMontant: null,
  }));

  const getEffective = (bank) => {
    if (bank.rateType === 'fixe') return bank.taux;
    const saron = saronRate ?? 0;
    if (bank.rateType === 'saron') return saron + (bank.marge ?? 0.5);
    if (bank.rateType === 'mixte') return (bank.taux ?? 0) + saron;
    return bank.taux;
  };

  const generate = useCallback((bank) => {
    const effective = getEffective(bank);
    if (effective == null && !bank.amort) return null;
    const rate = Number(effective || 0) / 100;
    const amortVal = Number(bank.amort || 0);
    let balance = hypo;
    const years = [];
    for (let y = 1; y <= 5; y++) {
      const interest = balance * rate;
      const actualAmort = Math.min(amortVal, balance);
      balance = Math.max(0, balance - actualAmort);
      years.push({
        year: y,
        interest: Math.round(interest),
        amortissement: Math.round(actualAmort),
        remaining: Math.round(balance),
      });
    }
    return years;
  }, [hypo, saronRate]);

  const projA = useMemo(() => generate(bankA), [generate, bankA]);
  const projB = useMemo(() => generate(bankB), [generate, bankB]);

  const outflows = useMemo(() => {
    const rev = Number(analysis?.revenus_locatifs || 0);
    const ch = Number(analysis?.charges_operationnelles || 0);
    const ges = Number(analysis?.gestion || 0);
    const imp = Number(analysis?.impot || 0);
    return rev - ch - ges - imp;
  }, [analysis]);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-heading font-semibold">Projection 5 ans</h3>
        {saronLoading && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            SARON...
          </div>
        )}
        {!saronLoading && saronRate != null && (
          <div className="text-xs text-muted-foreground">
            SARON: <span className="font-mono font-medium">{saronRate.toFixed(3)}%</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <BankInputs name="Banque A" color="amber" state={bankA} setState={setBankA} hypo={hypo} prixTotal={prixTotal} saronRate={saronRate} saronLoading={saronLoading} />
        <BankInputs name="Banque B" color="emerald" state={bankB} setState={setBankB} hypo={hypo} prixTotal={prixTotal} saronRate={saronRate} saronLoading={saronLoading} />
      </div>

      {(projA || projB) ? (
        <div className="flex flex-col lg:flex-row gap-4">
          {projA && <ProjectionTable label="Banque A" color="amber" data={projA} outflows={outflows} />}
          {projB && <ProjectionTable label="Banque B" color="emerald" data={projB} outflows={outflows} />}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Ajustez les paramètres bancaires pour voir la projection
        </p>
      )}
    </div>
  );
}
