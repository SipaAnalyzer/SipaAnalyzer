const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Provider = "openai" | "deepseek" | "zenmux" | "grok" | "groq";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type InvokePayload = {
  prompt?: string;
  system?: string;
  provider?: Provider;
  messages?: Message[];
};

const PROVIDER_CONFIG: Record<Provider, { apiKeyEnv: string; url: string; modelEnv: string; defaultModel: string }> = {
  openai: {
    apiKeyEnv: "OPENAI_API_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4.1-mini",
  },
  deepseek: {
    apiKeyEnv: "DEEPSEEK_API_KEY",
    url: "https://api.deepseek.com/v1/chat/completions",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
  },
  zenmux: {
    apiKeyEnv: "ZENMUX_API_KEY",
    url: "https://zenmux.ai/api/v1/chat/completions",
    modelEnv: "ZENMUX_MODEL",
    defaultModel: "z-ai/glm-4.7-flash-free",
  },
  grok: {
    apiKeyEnv: "GROK_API_KEY",
    url: "https://api.x.ai/v1/chat/completions",
    modelEnv: "GROK_MODEL",
    defaultModel: "grok-2",
  },
  groq: {
    apiKeyEnv: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
  },
};

const DEFAULT_SYSTEM = `Tu es un expert en analyse immobilière suisse. Tu travailles pour SIPA Immobilier SA.

TÂCHES AUTORISÉES :
- Analyser des biens immobiliers, leur rentabilité et leur structure financière
- Expliquer les métriques : rendement brut, rendement net/fonds propres, revenu distribué, score global (A-E)
- Comparer plusieurs biens ou scénarios bancaires
- Calculer des ratios, LTV (loan-to-value), rendements
- Expliquer le TABLEAU FINANCIER : Prix total = Prix du bien + Versement initial + Amort. 5 ans + Honoraires SIPA + Frais dossier bancaire
- Interpréter la projection 5 ans (intérêts, amortissement, solde, cash-flow)
- Donner des avis argumentés basés sur les chiffres

RÈGLES :
- Réponds toujours en français
- Utilise le Markdown pour structurer (listes, tableaux, **gras**)
- Sois précis et cite les chiffres
- Quand on te demande un conseil, précise "analyse à titre indicatif, soumise à validation par un conseiller SIPA"
- Ne donne PAS de conseil fiscal ou juridique personnalisé
- Reste professionnel et factuel`;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const payload = (await request.json().catch(() => ({}))) as InvokePayload;
  const provider: Provider = (payload.provider === "deepseek" || payload.provider === "zenmux" || payload.provider === "grok" || payload.provider === "groq") ? payload.provider : "groq";
  const cfg = PROVIDER_CONFIG[provider];

  const apiKey = Deno.env.get(cfg.apiKeyEnv);
  if (!apiKey) {
    return jsonResponse(
      { error: `${cfg.apiKeyEnv} est manquant dans les secrets Supabase.` },
      500
    );
  }

  const system = payload.system || DEFAULT_SYSTEM;
  const messages: Message[] = [{ role: "system", content: system }];

  if (payload.messages && payload.messages.length > 0) {
    messages.push(...payload.messages);
  } else if (payload.prompt) {
    messages.push({ role: "user", content: payload.prompt });
  } else {
    return jsonResponse({ error: "Prompt IA manquant." }, 400);
  }

  const model = Deno.env.get(cfg.modelEnv) || cfg.defaultModel;

  const response = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 4096,
      messages,
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return jsonResponse(
      {
        error:
          result?.error?.message ||
          `L'IA ${provider} n'a pas pu générer l'analyse.`,
      },
      response.status
    );
  }

  const outputText = extractOutputText(result);

  return jsonResponse({
    analysis_text:
      outputText ||
      "L'analyse IA a répondu, mais le contenu retourné est vide.",
  });
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function extractOutputText(result: any) {
  if (result?.choices?.[0]?.message?.content) {
    return result.choices[0].message.content;
  }
  return "";
}
