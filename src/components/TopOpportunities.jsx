import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import StatusBadge from './StatusBadge';
import { formatCHF, formatPercent } from '../utils/calculations';
import { TrendingUp } from 'lucide-react';

export default function TopOpportunities({ items = [] }) {
  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">Aucune opportunité à afficher</p>
        <p className="text-xs text-muted-foreground mt-1">Créez votre première analyse pour voir les meilleures opportunités</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <h2 className="font-heading font-semibold text-sm">Top 5 Opportunités</h2>
        <span className="text-xs text-muted-foreground">Classées par score</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left px-5 py-3 font-medium">Bien</th>
              <th className="text-left px-3 py-3 font-medium">Ville</th>
              <th className="text-center px-3 py-3 font-medium">Score</th>
              <th className="text-right px-3 py-3 font-medium">Rdt. Net / FP</th>
              <th className="text-right px-3 py-3 font-medium">Rdt. Brut</th>
              <th className="text-right px-3 py-3 font-medium">Prix Total</th>
              <th className="text-center px-5 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Link to={`/property/${item.property_id}`} className="font-medium hover:text-primary transition-colors">
                      {item.property?.nom_bien || 'Sans nom'}
                    </Link>
                    {item.property?.lien_annonce && (
                      <a href={item.property.lien_annonce} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors" title="Voir l'annonce">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-3 py-3 text-muted-foreground">{item.property?.ville}</td>
                <td className="px-3 py-3 text-center"><ScoreBadge note={item.note} /></td>
                <td className="px-3 py-3 text-right font-mono text-emerald-400">{formatPercent(item.rendement_net_fonds_propres)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatPercent(item.rendement_brut)}</td>
                <td className="px-3 py-3 text-right font-mono">{formatCHF(item.prix_total)}</td>
                <td className="px-5 py-3 text-center"><StatusBadge statut={item.statut} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}