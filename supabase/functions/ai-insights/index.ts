const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type InvokePayload = {
  prompt?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          "OPENAI_API_KEY est manquant dans les secrets Supabase de la fonction.",
      },
      500
    );
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
  const payload = (await request.json().catch(() => ({}))) as InvokePayload;
  const prompt = payload.prompt?.trim();

  if (!prompt) {
    return jsonResponse({ error: "Prompt IA manquant." }, 400);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.25,
      max_output_tokens: 1600,
      input: [
        {
          role: "system",
          content:
            "Tu es un analyste immobilier suisse. Réponds en français, en Markdown, de façon concise, professionnelle et exploitable. Tu ne donnes pas de conseil financier réglementé, tu aides à structurer l'analyse.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  const result = await response.json().catch(() => null);

  if (!response.ok) {
    return jsonResponse(
      {
        error:
          result?.error?.message ||
          "OpenAI n'a pas pu générer l'analyse IA.",
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
  if (typeof result?.output_text === "string") {
    return result.output_text;
  }

  const parts =
    result?.output
      ?.flatMap((item: any) => item?.content || [])
      ?.map((content: any) => content?.text)
      ?.filter(Boolean) || [];

  return parts.join("\n").trim();
}
