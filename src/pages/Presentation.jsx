import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { base44 } from '@/api/base44Client';
import { formatCHF, formatPercent, isActivePropertyStatus, isFinalizedPropertyStatus, normalizeAnalysis, STATUS_CONFIG, WORKFLOW_STATUSES } from '../utils/calculations';
import ScoreBadge from '../components/ScoreBadge';
import { geocodeProperties } from '../utils/geocode';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MapPin,
  Navigation,
  Printer,
  Sparkles,
  Trophy,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';



const safeNumber = (value) => Number(value) || 0;

const average = (items, selector) => {
  const values = items.map(selector).filter((value) => Number.isFinite(value));
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const PRESENTATION_STATUS_COLORS = {
  en_cours: '#3b82f6',
  demande_complementaire: '#06b6d4',
  visite_sipa: '#8b5cf6',
  demande_rapport_expertise_externe: '#6366f1',
  proposition_achat: '#f59e0b',
  negociation: '#f97316',
  proposition_acceptee: '#10b981',
  commercialise: '#84cc16',
  abandonne: '#ff0000',
};

const getPresentationStatusColor = (status) => PRESENTATION_STATUS_COLORS[status] || '#a5d63a';
const getPresentationStatusLabel = (status) => STATUS_CONFIG[status]?.label || status || 'Statut non renseigne';

const createScoreIcon = (property) => {
  const markerColor = getPresentationStatusColor(property.statut);
  const score = property.analysis?.score_global ? Math.round(property.analysis.score_global) : '';

  return L.divIcon({
    className: 'portfolio-marker',
    html: `
      <div style="
        width: 44px;
        height: 44px;
        border-radius: 999px;
        background: ${markerColor};
        border: 4px solid white;
        box-shadow: 0 12px 28px rgba(0,0,0,.32), 0 0 0 8px ${markerColor}33;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font: 700 12px Inter, Arial, sans-serif;
        letter-spacing: -.02em;
      ">${score}</div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -26],
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
const KNOWN_BAD_GEOCODE_POINTS = [
  [46.9413229, 7.4499253],
];

const isKnownBadGeocodePoint = (lat, lng) =>
  KNOWN_BAD_GEOCODE_POINTS.some(
    ([badLat, badLng]) =>
      Math.abs(lat - badLat) < 0.00001 && Math.abs(lng - badLng) < 0.00001
  );

function FitMapToProperties({ properties }) {
  const map = useMap();

  useEffect(() => {
    const coordinates = properties
      .map((property) => [Number(property.latitude), Number(property.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));

    if (coordinates.length === 0) {
      map.setView(LEMAN_CENTER, LEMAN_ZOOM);
      return;
    }

    if (coordinates.length === 1) {
      map.setView(coordinates[0], 12);
      return;
    }

    map.fitBounds(L.latLngBounds(coordinates), {
      padding: [54, 54],
      maxZoom: 12,
    });
  }, [map, properties]);

  return null;
}

function KpiTile({ icon: Icon, label, value, detail, clickable }) {
  return (
    <div className={`bg-card rounded-lg border border-border p-4 min-h-[104px] shadow-sm ${clickable ? 'hover:border-primary/50 hover:-translate-y-0.5 transition-all cursor-pointer' : ''}`}>
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

function HeroStat({ label, value, detail }) {
  return (
    <div className="border-l border-primary/30 pl-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-semibold text-foreground">{value}</p>
      {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
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

function DealSpotlight({ property }) {
  if (!property?.analysis) {
    return (
      <div className="rounded-lg border border-border bg-card p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Dossier phare</p>
        <p className="mt-6 text-sm text-muted-foreground">Aucun bien valide avec analyse disponible.</p>
      </div>
    );
  }

  const analysis = property.analysis;

  return (
    <Link to={`/property/${property.id}`} className="group block rounded-lg border border-primary/25 bg-card p-5 shadow-sm transition-all hover:border-primary/60 hover:-translate-y-0.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-primary">Dossier phare</p>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">Valide</span>
          <Trophy className="h-4 w-4 text-primary" />
        </div>
      </div>
      <h2 className="mt-4 font-heading text-xl font-semibold group-hover:text-primary">{property.nom_bien}</h2>
      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        {property.ville}{property.canton ? `, ${property.canton}` : ''}
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border bg-background">
        {property.image_url ? (
          <img
            src={property.image_url}
            alt={property.nom_bien}
            className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-44 w-full flex-col items-center justify-center gap-2 bg-primary/10 text-primary">
            <MapPin className="h-8 w-8" />
            <span className="text-xs font-medium">Photo du bien</span>
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg border border-primary/20 bg-primary/10 p-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-primary">Score global</p>
            <p className="mt-1 font-heading text-4xl font-bold text-primary">{analysis.score_global}/100</p>
          </div>
          <ScoreBadge note={analysis.note} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Prix total" value={formatCHF(analysis.prix_total)} />
        <Metric label="Fonds propres" value={formatCHF(analysis.fonds_propres)} />
        <Metric label="Hypotheque" value={formatCHF(analysis.hypotheque)} />
        <Metric label="Revenu distribue" value={formatCHF(analysis.revenu_distribue)} highlight />
        <Metric label="Rdt. brut" value={formatPercent(analysis.rendement_brut)} />
        <Metric label="Rdt. net/FP" value={formatPercent(analysis.rendement_net_fonds_propres)} highlight />
      </div>

      <div className="mt-5 border-t border-border/60 pt-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted-foreground">Ouvrir la fiche complete</span>
          <span className="font-medium text-primary group-hover:translate-x-0.5 transition-transform">Consulter</span>
        </div>
      </div>
    </Link>
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
      .filter((property) => isActivePropertyStatus(property.statut))
      .map((property) => {
        const latest = analyses
          .filter((analysis) => analysis.property_id === property.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        return { ...property, analysis: normalizeAnalysis(latest, property) };
      });
  }, [properties, analyses]);

  const valides = useMemo(() => {
    return properties
      .filter((property) => isFinalizedPropertyStatus(property.statut))
      .map((property) => {
        const latest = analyses
          .filter((analysis) => analysis.property_id === property.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        return { ...property, analysis: normalizeAnalysis(latest, property) };
      });
  }, [properties, analyses]);

  const allWithAnalysis = useMemo(() => {
    return properties.map((property) => {
      const latest = analyses
        .filter((analysis) => analysis.property_id === property.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

      return { ...property, analysis: latest ? normalizeAnalysis(latest, property) : null };
    });
  }, [properties, analyses]);

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
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      (lat !== 0 || lng !== 0) &&
      !isKnownBadGeocodePoint(lat, lng) &&
      property.latitude !== '' &&
      property.latitude != null
    );
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
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <section className="rounded-lg border border-border bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Selection presentation investisseur
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
              Portefeuille <span className="text-primary">SIPA</span>
            </h1>
          </div>
          <Button variant="outline" className="w-full gap-2 self-start sm:w-auto xl:self-auto" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Exporter
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <HeroStat label="Biens sur la carte" value={withCoords.length} detail={`${allWithAnalysis.length} biens du portefeuille`} />
          <HeroStat label="Dossiers en cours" value={enCours.length} detail={`${summary.withAnalysis} analyses disponibles`} />
          <HeroStat label="Valeur analysee" value={formatCHF(summary.totalValue)} detail={`Fonds propres ${formatCHF(summary.totalEquity)}`} />
          <HeroStat label="Rendement moyen" value={formatPercent(summary.avgNetEquityYield)} detail={`Brut ${formatPercent(summary.avgGrossYield)}`} />
        </div>
      </section>

      <div className="hidden">
        <div>
          <h1 className="font-display text-2xl font-bold">Présentation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue portefeuille des biens en cours d'analyse pour lecture comité
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto gap-2 self-start" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />
          Exporter
        </Button>
      </div>

      <div className="hidden">
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

      <section className="overflow-hidden rounded-lg border border-primary/20 bg-card shadow-lg">
        <div className="flex flex-col gap-3 border-b border-border bg-background/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading font-semibold">Carte du portefeuille</h2>
            <p className="mt-1 text-xs text-muted-foreground">Tous les biens, avec une couleur differente par statut</p>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Navigation className="h-3.5 w-3.5" />
            Bassin lemanique
          </div>
        </div>
        <div className="map-container relative" style={{ height: 'clamp(640px, 82vh, 980px)' }}>
        {withCoords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MapPin className="h-10 w-10" />
            <p className="text-sm">Aucune adresse à géocoder</p>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={LEMAN_ZOOM} style={{ width: '100%', height: '100%' }} className="z-0">
            <FitMapToProperties properties={withCoords} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded bg-gray-100 px-2 py-1 text-[11px] text-gray-700">
                    <span style={{ backgroundColor: getPresentationStatusColor(property.statut) }} className="h-2 w-2 rounded-full" />
                    {getPresentationStatusLabel(property.statut)}
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
          <div className="pointer-events-none absolute left-4 top-4 z-[400] hidden max-w-[360px] rounded-lg border border-border bg-card/95 p-4 shadow-2xl backdrop-blur md:block">
            <p className="text-[10px] uppercase tracking-[0.2em] text-primary">Tableau de bord live</p>
            <h3 className="mt-2 font-heading text-lg font-semibold">Selection cartographique</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="Biens visibles" value={withCoords.length} highlight />
              <Metric label="Statuts representes" value={new Set(withCoords.map((property) => property.statut)).size} highlight />
              <Metric label="Top score" value={summary.best?.analysis ? `${summary.best.analysis.score_global}/100` : '-'} />
              <Metric label="Net/FP moyen" value={formatPercent(summary.avgNetEquityYield)} />
            </div>
            <div className="mt-4 grid grid-cols-1 gap-1.5">
              {WORKFLOW_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: getPresentationStatusColor(status.value) }}
                  />
                  <span className="truncate">{status.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
        <DealSpotlight property={summary.best} />

      <div className="bg-card rounded-lg border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-heading font-semibold text-sm">Top opportunités</h2>
              <p className="text-xs text-muted-foreground mt-1">Classement par score puis rendement net/FP</p>
            </div>
            <Trophy className="h-4 w-4 text-primary" />
          </div>

          {rankedValides.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Aucun bien validé</p>
          ) : (
            <div className="space-y-3">
              {rankedValides.slice(0, 5).map((property, index) => (
                <div key={property.id} className={`rounded-lg border p-4 transition-all ${index === 0 ? 'border-primary/40 bg-primary/10 shadow-sm' : 'border-border/60 bg-background/60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-xs font-mono ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>#{index + 1}</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 mt-3 border-t border-border/50">
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

      <div className="hidden">
        <h2 className="font-heading font-semibold text-sm mb-4 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Top {Math.min(5, rankedValides.length)} — Biens validés ({valides.length})
        </h2>
      </div>
      {rankedValides.length > 0 && (
        <div className="hidden">
          {rankedValides.slice(0, 5).map((property) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border/50">
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
  );
}
