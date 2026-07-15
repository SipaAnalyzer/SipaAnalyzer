import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCHF, formatPercent, normalizeAnalysis } from '../utils/calculations';
import { formatSipaValue } from '../utils/excelImport';
import { exportAnalysisPdf } from '../utils/pdfExports';
import PdfExportDialog from '../components/PdfExportDialog';
import ScoreGauge from '../components/ScoreGauge';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import FinancialTable from '../components/FinancialTable';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, MapPin, Landmark, FileText, TrendingUp } from 'lucide-react';
import moment from 'moment';

export default function ViewAnalysis() {
  const { analysisId } = useParams();

  const { data: analysisRaw, isLoading } = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: () => base44.entities.Analysis.get(analysisId),
    enabled: !!analysisId,
  });

  const { data: property } = useQuery({
    queryKey: ['property', analysisRaw?.property_id],
    queryFn: () => base44.entities.Property.get(analysisRaw.property_id),
    enabled: !!analysisRaw?.property_id,
  });

  const analysis = normalizeAnalysis(analysisRaw, property?.ville);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Analyse introuvable
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to={property ? `/property/${property.id}` : '/properties'}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold">
            Analyse — {property?.nom_bien || '...'}
          </h1>
          {property && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3.5 w-3.5" />
              {property.ville}{property.canton ? `, ${property.canton}` : ''}
            </p>
          )}
        </div>

        <PdfExportDialog onExport={(sections) => exportAnalysisPdf(property, analysis, sections)} />
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          <div className="flex items-center gap-4">
            <ScoreGauge score={analysis.score_global || 0} size={110} />

            <div>
              <div className="flex items-center gap-2 mb-1">
                <ScoreBadge note={analysis.note} />
                <StatusBadge statut={analysis.statut} />
              </div>

              <p className="text-xs text-muted-foreground">
                {moment(analysis.created_at || analysis.created_date).format('DD MMM YYYY, HH:mm')}
              </p>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4">
            <MetricCard label="Prix total" value={formatCHF(analysis.prix_total)} />
            <MetricCard label="Revenu net" value={formatCHF(analysis.revenu_net)} />
            <MetricCard label="Revenu distribu" value={formatCHF(analysis.revenu_distribue)} />
            <MetricCard label="Rdt. brut" value={formatPercent(analysis.rendement_brut)} />
            <MetricCard label="Rdt. net / FP" value={formatPercent(analysis.rendement_net_fonds_propres)} highlight />
            <MetricCard label="Rdt. dist. / FP" value={formatPercent(analysis.revenu_distribue_fonds_propres)} highlight />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          Bien : <Link to={`/property/${property?.id}`} className="text-primary hover:underline">
            {property?.nom_bien || '...'}
          </Link>
          {property?.ville ? ` — ${property.ville}${property.canton ? `, ${property.canton}` : ''}` : ''}
        </span>
      </div>

      <FinancialTable analysis={analysis} />

      {analysis.sipa_data && analysis.sipa_data.filter((e) => !e._custom).length > 0 && (
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">Investissement SIPA</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Rubrique</th>
                  <th className="text-left py-2 pl-4 font-medium text-muted-foreground">Valeurs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {analysis.sipa_data.filter((e) => !e._custom).map((entry, i) => (
                  <tr key={i}>
                    <td className="py-2.5 pr-4 text-sm font-medium whitespace-nowrap">{entry.label}</td>
                    <td className="py-2.5 pl-4 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {entry.values.map((v, j) => (
                          <span key={j} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-muted/30">{formatSipaValue(v)}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold">Hypothèses bancaires</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankScenarioCard
            title="Banque A"
            color="amber"
            typeTaux={analysis.banque_a_type_taux}
            margeSaron={analysis.banque_a_marge_saron}
            taux={analysis.banque_a_taux_hypothecaire}
            amortissement={analysis.banque_a_amortissement_annuel}
            evaluation={analysis.banque_a_evaluation}
          />
          <BankScenarioCard
            title="Banque B"
            color="emerald"
            typeTaux={analysis.banque_b_type_taux}
            margeSaron={analysis.banque_b_marge_saron}
            taux={analysis.banque_b_taux_hypothecaire}
            amortissement={analysis.banque_b_amortissement_annuel}
            evaluation={analysis.banque_b_evaluation}
          />
        </div>
      </div>

      {analysis.notes && (
        <section className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-heading font-semibold">Informations complémentaires</h3>
          </div>
          <pre className="w-full bg-background border border-border rounded-lg p-3 text-sm font-mono whitespace-pre-wrap break-words">{analysis.notes}</pre>
        </section>
      )}

    </div>
  );
}

function MetricCard({ label, value, highlight }) {
  return (
    <div className={`px-4 py-3 rounded-lg border ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-lg font-semibold ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}

function BankScenarioCard({ title, color, typeTaux, margeSaron, taux, amortissement, evaluation }) {
  const rateLabel = typeTaux === 'saron'
    ? `Full SARON + ${Number(margeSaron ?? 0.5).toFixed(2)}%`
    : typeTaux === 'mixte'
      ? `Base ${Number(taux || 0).toFixed(2)}% + SARON`
      : `${taux || '—'}%`;

  return (
    <div className="p-4 rounded-lg border border-border space-y-3">
      <h4 className="font-medium text-sm">{title}</h4>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Taux</p>
          <p className={`text-lg font-semibold text-${color}-500`}>{rateLabel}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Amort.</p>
          <p className="text-lg font-semibold">{amortissement || '\u2014'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Éval.</p>
          <p className="text-lg font-semibold">{evaluation || '\u2014'}</p>
        </div>
      </div>
    </div>
  );
}
