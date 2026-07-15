import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Building2, Download, Loader2, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ScoreBadge from '../components/ScoreBadge';
import ScoreGauge from '../components/ScoreGauge';
import { calculateAnalysis, formatCHF, formatPercent, normalizeAnalysis } from '../utils/calculations';
import { exportComparisonPdf } from '../utils/pdfExports';

const COLORS = ['#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

function BenchmarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl">
      <p className="text-xs font-medium mb-2">{label}</p>
      <div className="space-y-1">
        {payload.map((item) => (
          <div key={item.dataKey} className="flex items-center justify-between gap-5 text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: item.color }} />
              {item.name}
            </span>
            <span className="font-mono text-foreground">
              {item.payload[`${item.dataKey}_formatted`]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
        analysis: normalizeAnalysis(latest, property.ville),
      };
    });
  }, [properties, analyses]);

  const selected = enriched.filter((property) => selectedIds.includes(property.id));
  const available = enriched.filter((property) => !selectedIds.includes(property.id));

  const [overrides, setOverrides] = useState({});

  const overrideField = (propertyId, field, value) => {
    setOverrides((prev) => ({
      ...prev,
      [propertyId]: { ...(prev[propertyId] || {}), [field]: value },
    }));
  };

  const getEffectiveAnalysis = (property) => {
    const base = property.analysis ? { ...property.analysis } : {};
    const ovr = overrides[property.id];
    const merged = { ...base, ...ovr, ville: property.ville };
    return { ...merged, ...calculateAnalysis(merged) };
  };

  const selectedForExport = useMemo(() => {
    return selected.map((property) => ({
      ...property,
      analysis: getEffectiveAnalysis(property),
    }));
  }, [selected, overrides]);

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

  const benchmarkData = useMemo(() => {
    if (selected.length < 2) return [];

    const metrics = [
      { key: 'score_global', label: 'Score', format: (value) => `${Math.round(value)}/100` },
      { key: 'rendement_brut', label: 'Rdt. brut', format: formatPercent },
      { key: 'rendement_net_fonds_propres', label: 'Rdt. net/FP', format: formatPercent },
      { key: 'revenu_distribue_fonds_propres', label: 'Rdt. distribué/FP', format: formatPercent },
      { key: 'revenu_net', label: 'Revenu net', format: formatCHF },
      { key: 'revenu_distribue', label: 'Revenu distribué', format: formatCHF },
    ];

    return metrics.map((metric) => {
      const rawValues = selected.map((property) => getEffectiveAnalysis(property)?.[metric.key] || 0);
      const max = Math.max(...rawValues.map((value) => Math.abs(value)), 1);
      const row = { metric: metric.label };

      selected.forEach((property, index) => {
        const rawValue = getEffectiveAnalysis(property)?.[metric.key] || 0;
        row[`bien_${index}`] = Math.max(0, (rawValue / max) * 100);
        row[`bien_${index}_formatted`] = metric.format(rawValue);
      });

      return row;
    });
  }, [selected, overrides]);

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
            <h2 className="font-heading font-semibold text-sm">Biens sélectionnés</h2>
            <p className="text-xs text-muted-foreground mt-1">
              {selected.length}/4 biens sélectionnés
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPicker((value) => !value)}
            disabled={selectedIds.length >= 4 || properties.length === 0}
            className="w-full sm:w-auto gap-2"
          >
            <Plus className="h-4 w-4" />
            Sélectionner des biens à comparer
          </Button>
        </div>

        {selected.length >= 2 && (
          <div className="flex justify-stretch sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto gap-2"
              onClick={() => exportComparisonPdf(selectedForExport)}
            >
              <Download className="h-4 w-4" />
              Exporter la comparaison
            </Button>
          </div>
        )}

        {selected.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            {selected.map((property, index) => (
              <div
                key={property.id}
                className="flex items-center gap-2 bg-background/70 border border-border rounded-lg px-3 py-2"
              >
                <div className="h-3 w-3 rounded-full" style={{ background: COLORS[index] }} />
                <span className="text-sm font-medium">{property.nom_bien}</span>
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
              <p className="text-sm text-muted-foreground">Aucun bien disponible à ajouter.</p>
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
                        <p className="text-sm font-medium truncate">{property.nom_bien}</p>
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
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6">
            <h3 className="font-heading font-semibold text-lg mb-1">
              Benchmark des indicateurs
            </h3>

            <p className="text-sm text-muted-foreground mb-6">
              Vue comparative normalisée: la meilleure valeur de chaque ligne sert de référence à 100.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-stretch">
              <div className="min-h-[360px] overflow-x-auto">
                <div className="min-w-[620px] h-[360px] sm:h-[420px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={benchmarkData} layout="vertical" barGap={4} barCategoryGap={18}>
                    <CartesianGrid stroke="#2A2A2A" horizontal={false} />
                    <XAxis
                      type="number"
                      domain={[0, 100]}
                      tick={{ fill: '#9CA3AF', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="metric"
                      width={132}
                      tick={{ fill: '#D4D4D8', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<BenchmarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                    {selected.map((property, index) => (
                      <Bar
                        key={property.id}
                        name={property.nom_bien}
                        dataKey={`bien_${index}`}
                        fill={COLORS[index]}
                        radius={[0, 5, 5, 0]}
                        maxBarSize={16}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {selected.map((property, index) => {
                  const effective = getEffectiveAnalysis(property);
                  return (
                  <div key={property.id} className="rounded-lg border border-border bg-background/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                          <p className="text-sm font-medium truncate">{property.nom_bien}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {property.ville || 'Ville inconnue'}
                        </p>
                      </div>
                      {effective && <ScoreBadge note={effective.note} />}
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Score</p>
                        <p className="text-lg font-semibold">
                          {Math.round(effective?.score_global || 0)}/100
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Net/FP</p>
                        <p className="text-lg font-semibold text-primary">
                          {formatPercent(effective?.rendement_net_fonds_propres || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-xs text-muted-foreground font-medium">
                    Métrique
                  </th>

                  {selected.map((property, index) => (
                    <th key={property.id} className="text-right px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index] }} />
                        <span className="text-xs font-medium">{property.nom_bien}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {[
                  {
                    label: 'Score',
                    fn: (a) => (
                      <div className="flex items-center justify-end gap-2">
                        <ScoreGauge score={a?.score_global || 0} size={40} />
                        <ScoreBadge note={a?.note} />
                      </div>
                    ),
                    editable: false,
                  },

                  { label: 'Prix du bien', field: 'prix_bien', editable: true },
                  { label: 'Fonds propres', field: 'fonds_propres', editable: true },
                  { label: 'Hypothèque', field: 'hypotheque', editable: true },
                  { label: 'Prix total', fn: (a) => formatCHF(a?.prix_total), editable: false },

                  { label: 'Revenus locatifs', field: 'revenus_locatifs', editable: true },
                  { label: 'Charges opérationnelles', field: 'charges_operationnelles', editable: true },
                  { label: 'Intérêt hypothécaire', field: 'interets_hypothecaires', editable: true },
                  { label: 'Gestion', field: 'gestion', editable: true },

                  { label: 'Rendement brut', fn: (a) => (a ? formatPercent(a.rendement_brut) : 'N/A'), editable: false },
                  { label: 'Revenu net', fn: (a) => (a ? formatCHF(a.revenu_net) : 'N/A'), editable: false },
                  { label: 'Rendement net / FP', fn: (a) => (a ? formatPercent(a.rendement_net_fonds_propres) : 'N/A'), editable: false },
                  { label: 'Revenu distribué', fn: (a) => (a ? formatCHF(a.revenu_distribue) : 'N/A'), editable: false },
                  { label: 'Rdt. distribué / FP', fn: (a) => (a ? formatPercent(a.revenu_distribue_fonds_propres) : 'N/A'), editable: false },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 text-xs text-muted-foreground">{row.label}</td>

                    {selected.map((property) => {
                      const effective = getEffectiveAnalysis(property);
                      return (
                        <td key={property.id} className="px-5 py-3 text-right">
                          {row.editable ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-[10px] text-muted-foreground mr-1">CHF</span>
                              <Input
                                type="number"
                                value={overrides[property.id]?.[row.field] ?? effective?.[row.field] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value === '' ? null : parseFloat(e.target.value) || 0;
                                  overrideField(property.id, row.field, v);
                                }}
                                className="w-28 h-8 text-xs text-right bg-background border-border"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-xs">{row.fn(effective)}</span>
                          )}
                        </td>
                      );
                    })}
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
