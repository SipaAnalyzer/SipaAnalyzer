import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIInsights({ analysis, property }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Tu es un analyste immobilier expert. Analyse cet investissement et fournis un résumé professionnel en français.

Bien: ${property?.nom_bien} à ${property?.ville}, ${property?.canton}
Année de construction: ${property?.annee_construction || 'N/A'}
Surface: ${property?.surface || 'N/A'} m²

Données financières:
- Prix total: ${analysis?.prix_total} CHF
- Fonds propres: ${analysis?.fonds_propres} CHF
- Hypothèque: ${analysis?.hypotheque} CHF
- Revenus locatifs: ${analysis?.revenus_locatifs} CHF
- Rendement brut: ${analysis?.rendement_brut}%
- Revenu net: ${analysis?.revenu_net} CHF
- Rendement net sur fonds propres: ${analysis?.rendement_net_fonds_propres}%
- Revenu distribué: ${analysis?.revenu_distribue} CHF
- Revenu distribué sur fonds propres: ${analysis?.revenu_distribue_fonds_propres}%
- Score global: ${analysis?.score_global}/100 (Note: ${analysis?.note})
- LTV: ${analysis?.prix_total > 0 ? ((analysis?.hypotheque / analysis?.prix_total) * 100).toFixed(1) : 0}%

Fournis exactement ces sections:
## Résumé de l'investissement
## Forces du dossier
## Faiblesses du dossier
## Risques potentiels
## Recommandation finale`,
      response_json_schema: {
        type: "object",
        properties: {
          analysis_text: { type: "string", description: "Full markdown analysis" }
        }
      }
    });
    setInsights(res.analysis_text);
    setLoading(false);
  };

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Analyse IA</h3>
        </div>
        <Button onClick={generate} disabled={loading} size="sm" variant="outline" className="gap-2">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {loading ? 'Analyse en cours...' : insights ? 'Régénérer' : 'Générer l\'analyse'}
        </Button>
      </div>
      <div className="p-5">
        {!insights && !loading && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Cliquez sur le bouton pour générer une analyse IA de cet investissement
          </p>
        )}
        {loading && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">L'IA analyse votre investissement...</span>
          </div>
        )}
        {insights && !loading && (
          <ReactMarkdown className="prose prose-sm prose-invert max-w-none [&_h2]:text-primary [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:text-foreground/80 [&_li]:text-foreground/80 [&_ul]:my-1 [&_strong]:text-foreground">
            {insights}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}