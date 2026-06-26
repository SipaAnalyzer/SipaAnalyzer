import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCHF } from '../utils/calculations';

function BankInputs({ name, color, taux, onTaux, amort, onAmort }) {
  const borderClass = color === 'amber' ? 'border-amber-500/25' : 'border-emerald-500/25';
  const bgClass = color === 'amber' ? 'bg-amber-500/5' : 'bg-emerald-500/5';
  const textClass = color === 'amber' ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className={`rounded-xl border ${borderClass} ${bgClass} p-5`}>
      <h4 className={`font-semibold mb-4 ${textClass}`}>{name}</h4>
      <div className="space-y-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Taux hypothécaire</Label>
          <div className="relative">
            <Input
              type="number"
              value={taux ?? ''}
              onChange={(e) => onTaux(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
              className="bg-background border-border pr-8 text-right"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">Amortissement annuel</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">CHF</span>
            <Input
              type="number"
              value={amort ?? ''}
              onChange={(e) => onAmort(e.target.value === '' ? null : parseFloat(e.target.value) || 0)}
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
  const [bankA, setBankA] = useState({
    taux: analysis?.banque_a_taux_hypothecaire ?? null,
    amort: analysis?.banque_a_amortissement_annuel ?? null,
  });
  const [bankB, setBankB] = useState({
    taux: analysis?.banque_b_taux_hypothecaire ?? null,
    amort: analysis?.banque_b_amortissement_annuel ?? null,
  });

  const hypo = Number(analysis?.hypotheque || 0);

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
        <BankInputs
          name="Banque A"
          color="amber"
          taux={bankA.taux}
          onTaux={(v) => setBankA((p) => ({ ...p, taux: v }))}
          amort={bankA.amort}
          onAmort={(v) => setBankA((p) => ({ ...p, amort: v }))}
        />
        <BankInputs
          name="Banque B"
          color="emerald"
          taux={bankB.taux}
          onTaux={(v) => setBankB((p) => ({ ...p, taux: v }))}
          amort={bankB.amort}
          onAmort={(v) => setBankB((p) => ({ ...p, amort: v }))}
        />
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
