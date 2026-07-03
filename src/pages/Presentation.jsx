import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { formatCHF, formatPercent, normalizeAnalysis } from '../utils/calculations';
import ScoreBadge from '../components/ScoreBadge';
import { geocodeProperties } from '../utils/geocode';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Printer,
  Trophy,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedBackground from "@/components/AnimatedBackground";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const safeNumber = (value) => Number(value) || 0;

const average = (items, selector) => {
  const values = items.map(selector).filter((value) => Number.isFinite(value));
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const createScoreIcon = (property) => {
  return L.divIcon({
    className: 'portfolio-marker',
    html: `
      <div style="
        width: 23px;
        height: 23px;
        border-radius: 999px;
        background: #ef4444;
        border: 3px solid white;
        box-shadow: 0 10px 25px rgba(0,0,0,.25);
      "></div>
    `,
    iconSize: [23, 23],
    iconAnchor: [11.5, 11.5],
    popupAnchor: [0, -16],
  });
};

const getStreetViewUrl = (property) => {
  const lat = Number(property.latitude);
  const lng = Number(property.longitude);

  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lat},${lng}`;
};

const getGoogleMapsUrl = (property) => {
  const lat = Number(property.latitude);
  const lng = Number(property.longitude);

  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

const LEMAN_CENTER = [46.47, 6.7];
const LEMAN_ZOOM = 9;

function FitMapToProperties({ properties }) {
  const map = useMap();

  useEffect(() => {
    map.setView(LEMAN_CENTER, LEMAN_ZOOM);
  }, [map, properties]);

  return null;
}

function KpiTile({ icon: Icon, label, value, detail, clickable }) {
  return (
    <div className={`bg-card rounded-lg border border-border p-4 min-h-[104px] ${clickable ? 'hover:border-primary/50 transition-colors cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-xl font-semibold mt-2">{value}</p>
          {detail && <p className="text-[11px] text-muted-foreground mt-1">{detail}</p>}
        </div>
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight = false }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={`text-xs font-mono font-medium ${highlight ? 'text-primary' : ''}`}>{value}</p>
    </div>
  );
}

export default function Presentation() {
  const queryClient = useQueryClient();
  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 200),
  });
  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 500),
  });

  const enCours = useMemo(() => {
    return properties
      .filter((property) => property.statut === 'en_cours')
      .map((property) => {
        const latest = analyses
          .filter((analysis) => analysis.property_id === property.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        return { ...property, analysis: normalizeAnalysis(latest) };
      });
  }, [properties, analyses]);

  const valides = useMemo(() => {
    return properties
      .filter((property) => property.statut === 'valide')
      .map((property) => {
        const latest = analyses
          .filter((analysis) => analysis.property_id === property.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        return { ...property, analysis: normalizeAnalysis(latest) };
      });
  }, [properties, analyses]);

  const allWithAnalysis = useMemo(() => [...enCours, ...valides], [enCours, valides]);

  const [geocodedCoords, setGeocodedCoords] = useState([]);

  const ranked = useMemo(() => {
    return [...enCours].sort((a, b) => {
      const scoreDiff = safeNumber(b.analysis?.score_global) - safeNumber(a.analysis?.score_global);
      if (scoreDiff !== 0) return scoreDiff;
      return safeNumber(b.analysis?.rendement_net_fonds_propres) - safeNumber(a.analysis?.rendement_net_fonds_propres);
    });
  }, [enCours]);

  const rankedValides = useMemo(() => {
    return [...valides].sort((a, b) => {
      const scoreDiff = safeNumber(b.analysis?.score_global) - safeNumber(a.analysis?.score_global);
      if (scoreDiff !== 0) return scoreDiff;
      return safeNumber(b.analysis?.rendement_net_fonds_propres) - safeNumber(a.analysis?.rendement_net_fonds_propres);
    });
  }, [valides]);

  const hasValidCoords = (property) => {
    const lat = Number(property.latitude);
    const lng = Number(property.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) && property.latitude !== '' && property.latitude != null;
  };

  const withCoords = useMemo(() => {
    const native = allWithAnalysis.filter(hasValidCoords);

    const geocoded = allWithAnalysis
      .filter((property) => geocodedCoords.some((c) => c.id === property.id))
      .map((property) => {
        const coords = geocodedCoords.find((c) => c.id === property.id);
        return { ...property, latitude: coords.latitude, longitude: coords.longitude };
      });

    return [...native, ...geocoded];
  }, [allWithAnalysis, geocodedCoords]);

  const withoutCoords = allWithAnalysis.filter(
    (property) => !withCoords.some((item) => item.id === property.id)
  );

  useEffect(() => {
    console.log('[presentation] allWithAnalysis length:', allWithAnalysis.length);
    const toGeocode = allWithAnalysis.filter((property) => !hasValidCoords(property));
    console.log('[presentation] toGeocode count:', toGeocode.length);

    if (toGeocode.length === 0) return;

    geocodeProperties(toGeocode).then(async (results) => {
      console.log('[presentation] geocode results:', results.length);
      setGeocodedCoords(results);
      for (const { id, latitude, longitude } of results) {
        try {
          await base44.entities.Property.update(id, { latitude, longitude });
        } catch (err) {
          console.error('Failed to save coordinates for', id, err);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['properties'] });
    });
  }, [allWithAnalysis]);

  const mapCenter = LEMAN_CENTER;

  const summary = useMemo(() => {
    const withAnalysis = enCours.filter((property) => property.analysis);
    const totalValue = withAnalysis.reduce((sum, property) => sum + safeNumber(property.analysis?.prix_total), 0);
    const totalEquity = withAnalysis.reduce((sum, property) => sum + safeNumber(property.analysis?.fonds_propres), 0);
    const best = rankedValides.find((property) => property.analysis);

    return {
      totalValue,
      totalEquity,
      avgGrossYield: average(withAnalysis, (property) => safeNumber(property.analysis?.rendement_brut)),
      avgNetEquityYield: average(withAnalysis, (property) => safeNumber(property.analysis?.rendement_net_fonds_propres)),
      best,
      withAnalysis: withAnalysis.length,
    };
  }, [rankedValides, enCours]);

  if (lp || la) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <AnimatedBackground className="animated-background-sm" />
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Présentation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue portefeuille des biens en cours d'analyse pour lecture comité
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Exporter
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiTile
          icon={MapPin}
          label="En cours d'analyse"
          value={enCours.length}
          detail={`${withCoords.length} sur la carte`}
        />
        <KpiTile
          icon={Wallet}
          label="Valeur totale"
          value={formatCHF(summary.totalValue)}
          detail={`Fonds propres ${formatCHF(summary.totalEquity)}`}
        />
        <KpiTile
          icon={BarChart3}
          label="Rendement moyen"
          value={formatPercent(summary.avgNetEquityYield)}
          detail={`Brut moyen ${formatPercent(summary.avgGrossYield)}`}
        />
        {summary.best ? (
          <a href={`/property/${summary.best.id}`} target="_blank" rel="noopener noreferrer" className="block">
            <KpiTile
              icon={Trophy}
              label="Meilleur dossier"
              value={summary.best?.analysis ? `${summary.best.analysis.score_global}/100` : '-'}
              detail={summary.best?.nom_bien || 'Aucune analyse disponible'}
              clickable
            />
          </a>
        ) : (
          <KpiTile
            icon={Trophy}
            label="Meilleur dossier"
            value="-"
            detail="Aucune analyse disponible"
          />
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)] gap-5">
        <div className="bg-card rounded-lg border border-border overflow-hidden min-h-[460px]">
          {withCoords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[460px] gap-3 text-muted-foreground">
              <MapPin className="h-10 w-10" />
              <p className="text-sm">Aucune adresse à géocoder</p>
            </div>
          ) : (
            <MapContainer center={mapCenter} zoom={LEMAN_ZOOM} style={{ height: 460, width: '100%' }} className="z-0">
              <FitMapToProperties properties={withCoords} />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                subdomains={['a', 'b', 'c', 'd']}
              />
              {withCoords.map((property) => (
                <Marker
                  key={property.id}
                  position={[Number(property.latitude), Number(property.longitude)]}
                  icon={createScoreIcon(property)}
                >
                  <Popup>
                    <div className="text-sm font-medium">{property.nom_bien}</div>
                    <div className="text-xs text-gray-500">
                      {property.ville}{property.canton ? `, ${property.canton}` : ''}
                    </div>
                    {property.analysis && (
                      <div className="text-xs mt-2 space-y-1">
                        <div>Score: {property.analysis.score_global}/100</div>
                        <div>Prix: {formatCHF(property.analysis.prix_total)}</div>
                        <div>Rdt. net/FP: {formatPercent(property.analysis.rendement_net_fonds_propres)}</div>
                      </div>
                    )}
                    {property.lien_annonce && (
                      <a href={property.lien_annonce} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1 mt-2">
                        Voir l'annonce <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      <a href={getStreetViewUrl(property)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                        Street View
                      </a>
                      <a href={getGoogleMapsUrl(property)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                        Google Maps
                      </a>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-heading font-semibold text-sm">Top opportunités</h2>
              <p className="text-xs text-muted-foreground mt-1">Classement par score puis rendement net/FP</p>
            </div>
            <Trophy className="h-4 w-4 text-primary" />
          </div>

          {ranked.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun bien en cours d'analyse</p>
          ) : (
            <div className="space-y-3">
              {ranked.slice(0, 5).map((property, index) => (
                <div key={property.id} className="rounded-lg border border-border/60 p-4 bg-background/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>
                        <Link to={`/property/${property.id}`} className="text-sm font-medium hover:text-primary truncate">
                          {property.nom_bien}
                        </Link>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {property.ville}{property.canton ? `, ${property.canton}` : ''}
                      </p>
                    </div>
                    {property.analysis && <ScoreBadge note={property.analysis.note} />}
                  </div>

                  {property.analysis ? (
                    <div className="grid grid-cols-3 gap-3 pt-3 mt-3 border-t border-border/50">
                      <Metric label="Prix" value={formatCHF(property.analysis.prix_total)} />
                      <Metric label="Rdt. net/FP" value={formatPercent(property.analysis.rendement_net_fonds_propres)} highlight />
                      <Metric label="Distribué" value={formatCHF(property.analysis.revenu_distribue)} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
                      Aucune analyse liée à ce bien
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {withoutCoords.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="font-heading font-semibold text-sm">Biens sans coordonnées GPS</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {withoutCoords.map((property) => (
              <div key={property.id} className="rounded-lg border border-border/60 bg-background/60 p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/property/${property.id}`} className="text-sm font-medium hover:text-primary">
                    {property.nom_bien}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-1">
                    {property.ville}{property.canton ? `, ${property.canton}` : ''}
                  </p>
                </div>
                {property.analysis && <ScoreBadge note={property.analysis.note} />}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2">
        <h2 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Biens validés ({valides.length})
        </h2>
      </div>
      {valides.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {valides.map((property) => (
            <div key={property.id} className="bg-card rounded-lg border border-border p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/property/${property.id}`} className="font-heading font-semibold text-sm hover:text-primary transition-colors">
                    {property.nom_bien}
                  </Link>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {property.ville}{property.canton ? `, ${property.canton}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {property.lien_annonce && (
                    <a href={property.lien_annonce} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors" title="Voir l'annonce">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {property.analysis && <ScoreBadge note={property.analysis.note} />}
                </div>
              </div>
              {property.analysis ? (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                  <Metric label="Prix total" value={formatCHF(property.analysis.prix_total)} />
                  <Metric label="Rdt. brut" value={formatPercent(property.analysis.rendement_brut)} />
                  <Metric label="Rdt. net/FP" value={formatPercent(property.analysis.rendement_net_fonds_propres)} highlight />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pt-3 border-t border-border/50">
                  Aucune analyse disponible
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
