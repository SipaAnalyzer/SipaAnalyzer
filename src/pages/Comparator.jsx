import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import ScoreBadge from '../components/ScoreBadge';
import ScoreGauge from '../components/ScoreGauge';
import { formatCHF, formatPercent } from '../utils/calculations';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Loader2, X, Plus, Building2 } from 'lucide-react';

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

export default function Comparator() {
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPicker, setShowPicker] = useState(false);

  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 200),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 500),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const enriched = useMemo(() => {
    return properties.map((property) => {
      const latest = analyses
        .filter((analysis) => analysis.property_id === property.id)
        .sort(
          (a, b) =>
            new Date(b.created_date || b.created_at || 0) -
            new Date(a.created_date || a.created_at || 0)
        )[0];

      return {
        ...property,
        analysis: latest || null,
      };
    });
  }, [properties, analyses]);

  const selected = enriched.filter((property) => selectedIds.includes(property.id));
  const available = enriched.filter((property) => !selectedIds.includes(property.id));

  const addProperty = (id) => {
    setSelectedIds((current) => {
      if (current.includes(id)) return current;
      if (current.length >= 4) return current;
      return [...current, id];
    });

    setShowPicker(false);
  };

  const removeProperty = (id) => {
    setSelectedIds((current) => current.filter((item) => item !== id));
  };

  const radarData = useMemo(() => {
    if (selected.length < 2) return [];

    const metrics = [
      { key: 'rendement_brut', label: 'Rdt. Brut' },
      { key: 'rendement_net_fonds_propres', label: 'Rdt. Net/FP' },
      { key: 'revenu_distribue_fonds_propres', label: 'Rdt. Dist./FP' },
      { key: 'score_global', label: 'Score' },
    ];

    return metrics.map((metric) => {
      const row = { metric: metric.label };

      selected.forEach((property, index) => {
        row[`bien_${index}`] = property.analysis?.[metric.key] || 0;
      });

      return row;
    });
  }, [selected]);

  if (lp || la) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Comparateur</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez au moins 2 biens pour les comparer côte à côte.
        </p>
      </div>

      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-heading font-semibold text-sm">
              Biens sélectionnés
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {selected.length}/4 biens sélectionnés
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPicker((value) => !value)}
            disabled={selectedIds.length >= 4 || properties.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Sélectionner des biens à comparer
          </Button>
        </div>

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {selected.map((property, index) => (
              <div
                key={property.id}
                className="flex items-center gap-2 bg-background/70 border border-border rounded-lg px-3 py-2"
              >
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ background: COLORS[index] }}
                />
                <span className="text-sm font-medium">
                  {property.nom_bien}
                </span>
                <button
                  type="button"
                  onClick={() => removeProperty(property.id)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun bien sélectionné pour le moment.
          </p>
        )}

        {showPicker && (
          <div className="border-t border-border pt-4">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun bien disponible à ajouter.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {available.map((property) => (
                  <button
                    key={property.id}
                    type="button"
                    onClick={() => addProperty(property.id)}
                    className="text-left bg-background/70 border border-border rounded-lg p-4 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center text-primary shrink-0">
                        <Building2 className="h-4 w-4" />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {property.nom_bien}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {property.ville || 'Ville inconnue'}
                        </p>

                        {property.analysis ? (
                          <div className="mt-2 flex items-center gap-2">
                            <ScoreBadge note={property.analysis.note} />
                            <span className="text-xs text-muted-foreground">
                              Score {property.analysis.score_global || 0}/100
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-400 mt-2">
                            Aucune analyse liée
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selected.length === 1 && (
          <p className="text-xs text-amber-400">
            Sélectionnez encore au moins 1 bien pour lancer la comparaison.
          </p>
        )}
      </div>

      {selected.length >= 2 && (
        <>
          <div className="bg-card rounded-xl border border-border p-6">
            <h3 className="font-heading font-semibold text-lg mb-1">
              Comparaison radar
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
              Comparaison des performances entre les biens sélectionnés.
            </p>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-center">
              <div className="xl:col-span-3 grid grid-cols-1 gap-4">
                {selected.slice(0, 2).map((property, index) => (
                  <div key={property.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: COLORS[index] }}
                      />
                      <span className="font-semibold text-sm truncate">
                        {property.nom_bien}
                      </span>
                    </div>

                    <div
                      className="rounded-xl border p-4 bg-background/40"
                      style={{ borderColor: COLORS[index] }}
                    >
                      <p className="text-muted-foreground text-xs mb-1">
                        Score
                      </p>
                      <div className="flex items-end gap-2">
                        <span
                          className="text-4xl font-bold"
                          style={{ color: COLORS[index] }}
                        >
                          {Math.round(property.analysis?.score_global || 0)}
                        </span>
                        <span className="text-muted-foreground text-lg mb-1">
                          /100
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="xl:col-span-6">
                <ResponsiveContainer width="100%" height={520}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#303030" />

                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{
                        fill: '#B0B0B0',
                        fontSize: 15,
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: '#161616',
                        border: '1px solid #333',
                        borderRadius: '12px',
                      }}
                    />

                    {selected.map((property, index) => (
                      <Radar
                        key={property.id}
                        name={property.nom_bien}
                        dataKey={`bien_${index}`}
                        stroke={COLORS[index]}
                        fill={COLORS[index]}
                        fillOpacity={0.18}
                        strokeWidth={3}
                      />
                    ))}
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="xl:col-span-3 grid grid-cols-1 gap-4">
                {selected.slice(2, 4).map((property, relativeIndex) => {
                  const index = relativeIndex + 2;

                  return (
                    <div key={property.id}>
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-4 h-4 rounded-sm"
                          style={{ backgroundColor: COLORS[index] }}
                        />
                        <span className="font-semibold text-sm truncate">
                          {property.nom_bien}
                        </span>
                      </div>

                      <div
                        className="rounded-xl border p-4 bg-background/40"
                        style={{ borderColor: COLORS[index] }}
                      >
                        <p className="text-muted-foreground text-xs mb-1">
                          Score
                        </p>
                        <div className="flex items-end gap-2">
                          <span
                            className="text-4xl font-bold"
                            style={{ color: COLORS[index] }}
                          >
                            {Math.round(property.analysis?.score_global || 0)}
                          </span>
                          <span className="text-muted-foreground text-lg mb-1">
                            /100
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">
                    Métrique
                  </th>

                  {selected.map((property, index) => (
                    <th key={property.id} className="text-right px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: COLORS[index] }}
                        />
                        <span className="text-xs font-medium">
                          {property.nom_bien}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    label: 'Score',
                    fn: (analysis) =>
                      analysis ? (
                        <div className="flex items-center justify-end gap-2">
                          <ScoreGauge score={analysis.score_global || 0} size={40} />
                          <ScoreBadge note={analysis.note} />
                        </div>
                      ) : (
                        'N/A'
                      ),
                  },
                  { label: 'Prix total', fn: (a) => (a ? formatCHF(a.prix_total) : 'N/A') },
                  { label: 'Rendement brut', fn: (a) => (a ? formatPercent(a.rendement_brut) : 'N/A') },
                  { label: 'Rendement net / FP', fn: (a) => (a ? formatPercent(a.rendement_net_fonds_propres) : 'N/A') },
                  { label: 'Revenu net', fn: (a) => (a ? formatCHF(a.revenu_net) : 'N/A') },
                  { label: 'Revenu distribué', fn: (a) => (a ? formatCHF(a.revenu_distribue) : 'N/A') },
                  { label: 'Fonds propres', fn: (a) => (a ? formatCHF(a.fonds_propres) : 'N/A') },
                  { label: 'Hypothèque', fn: (a) => (a ? formatCHF(a.hypotheque) : 'N/A') },
                ].map((row) => (
                  <tr
                    key={row.label}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      {row.label}
                    </td>

                    {selected.map((property) => (
                      <td
                        key={property.id}
                        className="px-5 py-3 text-right font-mono text-xs"
                      >
                        {row.fn(property.analysis)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}