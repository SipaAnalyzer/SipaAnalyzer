import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let latest = await fetchSaronFromDataApi();
    if (!latest) {
      latest = await fetchSaronFromCurrentRatesPage();
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: latest || null,
        message: latest ? "SARON retrieved" : "No SARON data found",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("saron-rate error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function fetchSaronFromDataApi() {
  const res = await fetch(
    "https://data.snb.ch/api/warehouse/cube/snb_saron_compound/data?lang=EN",
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "SIPA-Analyzer/1.0",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("SNB API error:", res.status, text.slice(0, 500));
    return null;
  }

  const text = await res.text();
  if (text.trim().startsWith("<")) {
    console.warn("SNB data API returned HTML; falling back to current rates page");
    return null;
  }

  const json = JSON.parse(text);
  const observations = json?.data?.resultSets?.[0]?.observations || [];
  let latest = null;
  for (const obs of observations) {
    const date = obs?.attributes?.[0]?.value;
    const value = obs?.attributes?.[1]?.value;
    if (date && value !== undefined) {
      const rate = parseFloat(value);
      if (!isNaN(rate) && (!latest || date > latest.date)) {
        latest = { date, rate_pct: rate };
      }
    }
  }
  return latest;
}

async function fetchSaronFromCurrentRatesPage() {
  const res = await fetch(
    "https://www.snb.ch/en/the-snb/mandates-goals/statistics/statistics-pub/current_interest_exchange_rates",
    {
      headers: {
        Accept: "text/html",
        "User-Agent": "SIPA-Analyzer/1.0",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error("SNB current rates page error:", res.status, text.slice(0, 500));
    throw new Error(`SNB current rates page returned ${res.status}`);
  }

  const html = await res.text();
  const saronBlock = html.match(/<span class="heading">\s*SARON\s*<\/span>[\s\S]*?<span>\s*([+-]?\d+(?:[.,]\d+)?)%\s*<\/span>[\s\S]*?fixing at the close of the trading day,\s*(\d{2}\.\d{2}\.\d{4})/i);
  if (!saronBlock) {
    throw new Error("Could not parse SARON from SNB current rates page");
  }

  const [, rawRate, rawDate] = saronBlock;
  const [day, month, year] = rawDate.split(".");
  return {
    date: `${year}-${month}-${day}`,
    rate_pct: parseFloat(rawRate.replace(",", ".")),
  };
}
