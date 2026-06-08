import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { formatCHF, formatPercent } from '../utils/calculations';
import ScoreBadge from '../components/ScoreBadge';
import { ExternalLink, MapPin, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

// Fix leaflet default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function Presentation() {
  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 200),
  });
  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 500),
  });

  const validated = useMemo(() => {
    return properties
      .filter(p => p.statut === 'valide')
      .map(p => {
        const latest = analyses
          .filter(a => a.property_id === p.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];
        return { ...p, analysis: latest };
      });
  }, [properties, analyses]);

  const withCoords = validated.filter(p => p.latitude && p.longitude);

  // Default center on Switzerland
  const mapCenter = withCoords.length > 0
    ? [withCoords[0].latitude, withCoords[0].longitude]
    : [46.8182, 8.2275];

  if (lp || la) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Présentation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {validated.length} bien{validated.length > 1 ? 's' : ''} validé{validated.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Map */}
      <div className="bg-card rounded-xl border border-border overflow-hidden" style={{ height: 420 }}>
        {withCoords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <MapPin className="h-10 w-10" />
            <p className="text-sm">Renseignez les coordonnées GPS des biens validés pour les afficher sur la carte</p>
          </div>
        ) : (
          <MapContainer center={mapCenter} zoom={9} style={{ height: '100%', width: '100%' }} className="z-0">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {withCoords.map(p => (
              <Marker key={p.id} position={[p.latitude, p.longitude]}>
                <Popup>
                  <div className="text-sm font-medium">{p.nom_bien}</div>
                  <div className="text-xs text-gray-500">{p.ville}{p.canton ? `, ${p.canton}` : ''}</div>
                  {p.analysis && (
                    <div className="text-xs mt-1">
                      Score: {p.analysis.score_global}/100 — {formatCHF(p.analysis.prix_total)}
                    </div>
                  )}
                  {p.lien_annonce && (
                    <a href={p.lien_annonce} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline flex items-center gap-1 mt-1">
                      Voir l'annonce <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Property Cards */}
      {validated.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <p className="text-muted-foreground text-sm">Aucun bien validé pour le moment</p>
          <p className="text-xs text-muted-foreground mt-1">Passez un bien au statut "Validé" pour le voir ici</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {validated.map(p => (
            <div key={p.id} className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/property/${p.id}`} className="font-heading font-semibold text-sm hover:text-primary transition-colors">
                    {p.nom_bien}
                  </Link>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.ville}{p.canton ? `, ${p.canton}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.lien_annonce && (
                    <a href={p.lien_annonce} target="_blank" rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary transition-colors" title="Voir l'annonce">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {p.analysis && <ScoreBadge note={p.analysis.note} />}
                </div>
              </div>
              {p.analysis && (
                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Prix total</p>
                    <p className="text-xs font-mono font-medium">{formatCHF(p.analysis.prix_total)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rdt. brut</p>
                    <p className="text-xs font-mono font-medium">{formatPercent(p.analysis.rendement_brut)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Rdt. net/FP</p>
                    <p className="text-xs font-mono font-medium text-primary">{formatPercent(p.analysis.rendement_net_fonds_propres)}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}