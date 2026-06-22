import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function AIInsights({ analysis, property }) {
  const [insights, setInsights] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt({ analysis, property }),
        response_json_schema: {
          type: 'object',
          properties: {
            analysis_text: {
              type: 'string',
              description: 'Analyse complète au format Markdown',
            },
          },
          required: ['analysis_text'],
        },
      });

      setInsights(res.analysis_text);
    } catch (err) {
      setError(
        err?.message ||
          "Impossible de générer l'analyse IA. Vérifie la configuration OpenAI côté Supabase."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-heading font-semibold text-sm">Analyse IA</h3>
        </div>

        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
          variant="outline"
          className="gap-2 self-start sm:self-auto"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {loading ? 'Analyse en cours...' : insights ? 'Régénérer' : "Générer l'analyse"}
        </Button>
      </div>

      <div className="p-5">
        {!insights && !loading && !error && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Cliquez sur le bouton pour générer une analyse IA de cet investissement.
          </p>
        )}

        {error && !loading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-start gap-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8 gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">
              L'IA analyse votre investissement...
            </span>
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

function buildPrompt({ analysis, property }) {
  const ltv =
    analysis?.prix_bien > 0
      ? ((analysis?.hypotheque / analysis?.prix_bien) * 100).toFixed(1)
      : '0.0';

  return `Tu es un analyste immobilier expert. Analyse cet investissement et fournis un résumé professionnel en français.

Bien:
- Nom: ${property?.nom_bien || 'N/A'}
- Ville: ${property?.ville || 'N/A'}
- Canton: ${property?.canton || 'N/A'}
- Année de construction: ${property?.annee_construction || 'N/A'}
- Surface: ${property?.surface || 'N/A'} m2
- Nombre de logements: ${property?.nombre_logements || 'N/A'}

Données financières:
- Prix du bien original: ${analysis?.prix_bien || 0} CHF
- Total Revenus SIPA: ${analysis?.prix_total || 0} CHF
- Fonds propres: ${analysis?.fonds_propres || 0} CHF
- Hypothèque: ${analysis?.hypotheque || 0} CHF
- Revenus locatifs annuels: ${analysis?.revenus_locatifs || 0} CHF
- Charges opérationnelles: ${analysis?.charges_operationnelles || 0} CHF
- Revenu net: ${analysis?.revenu_net || 0} CHF
- Revenu distribué: ${analysis?.revenu_distribue || 0} CHF
- Rendement brut: ${analysis?.rendement_brut || 0}%
- Rendement net sur fonds propres: ${analysis?.rendement_net_fonds_propres || 0}%
- Revenu distribué sur fonds propres: ${analysis?.revenu_distribue_fonds_propres || 0}%
- Score global: ${analysis?.score_global || 0}/100
- Note: ${analysis?.note || 'N/A'}
- LTV sur prix original: ${ltv}%

Fournis exactement ces sections:
## Résumé de l'investissement
## Forces du dossier
## Faiblesses du dossier
## Risques potentiels
## Recommandation finale

Reste concret: cite les chiffres importants, explique les points d'attention, et donne une recommandation opérationnelle.`;
}
