import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { formatCHF, formatPercent, normalizeAnalysis } from '../utils/calculations';
import { exportAnalysisPdf } from '../utils/pdfExports';
import ScoreGauge from '../components/ScoreGauge';
import ScoreBadge from '../components/ScoreBadge';
import StatusBadge from '../components/StatusBadge';
import PerformanceCharts from '../components/PerformanceCharts';
import AIInsights from '../components/AIInsights';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Download, MapPin, Landmark } from 'lucide-react';
import moment from 'moment';

export default function ViewAnalysis() {
  const { analysisId } = useParams();

  const { data: analysisRaw, isLoading } = useQuery({
    queryKey: ['analysis', analysisId],
    queryFn: () => base44.entities.Analysis.get(analysisId),
    enabled: !!analysisId,
  });

  const analysis = normalizeAnalysis(analysisRaw);

  const { data: property } = useQuery({
    queryKey: ['property', analysis?.property_id],
    queryFn: () => base44.entities.Property.get(analysis.property_id),
    enabled: !!analysis?.property_id,
  });

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

        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => exportAnalysisPdf(property, analysis)}
        >
          <Download className="h-3.5 w-3.5" />
          PDF
        </Button>
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

      <PerformanceCharts analysis={analysis} />

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold">Hypothèses bancaires</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BankScenarioCard
            title="Banque A"
            color="amber"
            taux={analysis.banque_a_taux_hypothecaire}
            amortissement={analysis.banque_a_amortissement_annuel}
            evaluation={analysis.banque_a_evaluation}
          />
          <BankScenarioCard
            title="Banque B"
            color="emerald"
            taux={analysis.banque_b_taux_hypothecaire}
            amortissement={analysis.banque_b_amortissement_annuel}
            evaluation={analysis.banque_b_evaluation}
          />
        </div>
      </div>

      {property && <AIInsights analysis={analysis} property={property} />}
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

function BankScenarioCard({ title, color, taux, amortissement, evaluation }) {
  return (
    <div className="p-4 rounded-lg border border-border space-y-3">
      <h4 className="font-medium text-sm">{title}</h4>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Taux</p>
          <p className={`text-lg font-semibold text-${color}-500`}>{taux || '\u2014'}</p>
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
