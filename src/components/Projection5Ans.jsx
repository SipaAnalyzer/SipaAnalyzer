import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCHF } from '../utils/calculations';

function BankInputs({ name, color, state, setState, hypo, prixBien }) {
  const borderClass = color === 'amber' ? 'border-amber-500/25' : 'border-emerald-500/25';
  const bgClass = color === 'amber' ? 'bg-amber-500/5' : 'bg-emerald-500/5';
  const textClass = color === 'amber' ? 'text-amber-400' : 'text-emerald-400';

  const handleTaux = (v) => {
    setState((prev) => {
      const next = { ...prev, taux: v };
      if (v != null && v > 0 && prev.duree != null && prev.duree > 0) {
        const rate = v / 100;
        const n = prev.duree;
        const pmt = hypo * rate * Math.pow(1 + rate, n) / (Math.pow(1 + rate, n) - 1);
        const year1Interest = hypo * rate;
        next.amort = Math.round(Math.max(0, pmt - year1Interest));
      }
      return next;
    });
  };

  const handleAmort = (v) => {
    setState((prev) => {
      const next = { ...prev, amort: v };
      if (v != null && v > 0) {
        next.duree = Math.round(hypo / v);
      }
      return next;
    });
  };

  const handleDuree = (v) => {
    setState((prev) => {
      const next = { ...prev, duree: v };
      if (v != null && v > 0) {
        next.amort = Math.round(hypo / v);
      }
      return next;
    });
  };

  const handleEvalPct = (v) => {
    setState((prev) => {
      const next = { ...prev, evalPct: v };
      if (v != null && v > 0 && prixBien > 0) {
        next.evalMontant = Math.round(prixBien * v / 100);
      }
      return next;
    });
  };

  const handleEvalMontant = (v) => {
    setState((prev) => {
      const next = { ...prev, evalMontant: v };
      if (v != null && v > 0 && prixBien > 0) {
        next.evalPct = Math.round((v / prixBien) * 10000) / 100;
      }
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
          <p className="text-[10px] text-muted-foreground mt-1">du prix du bâtiment</p>
        </div>
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
  const defaultDuree = 20;

  const [bankA, setBankA] = useState(() => {
    const a = analysis?.banque_a_amortissement_annuel;
    return {
      taux: analysis?.banque_a_taux_hypothecaire ?? null,
      duree: a && a > 0 ? Math.round(hypo / a) : defaultDuree,
      amort: a ?? null,
      evalPct: null,
      evalMontant: null,
    };
  });

  const [bankB, setBankB] = useState(() => {
    const a = analysis?.banque_b_amortissement_annuel;
    return {
      taux: analysis?.banque_b_taux_hypothecaire ?? null,
      duree: a && a > 0 ? Math.round(hypo / a) : defaultDuree,
      amort: a ?? null,
      evalPct: null,
      evalMontant: null,
    };
  });

  const generate = useCallback((taux, amort) => {
    if (!taux && !amort) return null;
    const rate = Number(taux || 0) / 100;
    const amortVal = Number(amort || 0);
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
  }, [hypo]);

  const projA = useMemo(() => generate(bankA.taux, bankA.amort), [generate, bankA]);
  const projB = useMemo(() => generate(bankB.taux, bankB.amort), [generate, bankB]);

  const outflows = useMemo(() => {
    const rev = Number(analysis?.revenus_locatifs || 0);
    const ch = Number(analysis?.charges_operationnelles || 0);
    const ges = Number(analysis?.gestion || 0);
    const imp = Number(analysis?.impot || 0);
    return rev - ch - ges - imp;
  }, [analysis]);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="font-heading font-semibold mb-5">Projection 5 ans</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <BankInputs name="Banque A" color="amber" state={bankA} setState={setBankA} hypo={hypo} prixBien={prixBien} />
        <BankInputs name="Banque B" color="emerald" state={bankB} setState={setBankB} hypo={hypo} prixBien={prixBien} />
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
