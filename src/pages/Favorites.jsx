import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, Loader2, MapPin, Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import FavoriteButton from '../components/FavoriteButton';
import ScoreBadge from '../components/ScoreBadge';
import ScoreGauge from '../components/ScoreGauge';
import StatusBadge from '../components/StatusBadge';
import { useFavorites } from '@/hooks/useFavorites';
import { formatCHF, formatPercent, normalizeAnalysis } from '../utils/calculations';

export default function Favorites() {
  const { favoritePropertyIds, isLoading: lf } = useFavorites();

  const { data: properties = [], isLoading: lp } = useQuery({
    queryKey: ['properties'],
    queryFn: () => base44.entities.Property.list('-created_date', 200),
  });

  const { data: analyses = [], isLoading: la } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => base44.entities.Analysis.list('-created_date', 500),
  });

  const favorites = useMemo(() => {
    return properties
      .filter((property) => favoritePropertyIds.includes(property.id))
      .map((property) => {
        const propAnalyses = analyses
          .filter((analysis) => analysis.property_id === property.id)
          .sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

        return {
          ...property,
          latestAnalysis: normalizeAnalysis(propAnalyses[0], property),
          analysisCount: propAnalyses.length,
        };
      });
  }, [analyses, favoritePropertyIds, properties]);

  if (lf || lp || la) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="font-display text-2xl font-bold">Favoris</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {favorites.length} bien{favorites.length > 1 ? 's' : ''} suivi{favorites.length > 1 ? 's' : ''} de près
        </p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center">
          <Star className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Aucun favori pour le moment</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez une étoile sur un bien pour le retrouver ici rapidement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {favorites.map((property) => (
            <Link key={property.id} to={`/property/${property.id}`} className="block">
              <div className="bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-sm truncate group-hover:text-primary transition-colors">
                      {property.nom_bien}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {property.ville}
                      {property.canton ? `, ${property.canton}` : ''}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FavoriteButton propertyId={property.id} className="h-8 w-8 z-10" />
                    {property.lien_annonce && (
                      <a
                        href={property.lien_annonce}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className="text-muted-foreground hover:text-primary transition-colors z-10"
                        title="Voir l'annonce"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    {property.latestAnalysis && (
                      <ScoreGauge score={property.latestAnalysis.score_global || 0} size={60} />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge statut={property.statut} />
                  {property.latestAnalysis?.note && <ScoreBadge note={property.latestAnalysis.note} />}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {property.analysisCount} analyse{property.analysisCount > 1 ? 's' : ''}
                  </span>
                </div>

                {property.latestAnalysis && (
                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Prix total</p>
                      <p className="text-xs font-mono font-medium">
                        {formatCHF(property.latestAnalysis.prix_total)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rdt. brut</p>
                      <p className="text-xs font-mono font-medium">
                        {formatPercent(property.latestAnalysis.rendement_brut)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Rdt. net/FP</p>
                      <p className="text-xs font-mono font-medium text-primary">
                        {formatPercent(property.latestAnalysis.rendement_net_fonds_propres)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
