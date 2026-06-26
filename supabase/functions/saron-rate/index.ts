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
      throw new Error(`SNB API returned ${res.status}`);
    }

    const json = await res.json();
    const observations = json?.data?.resultSets?.[0]?.observations || [];
    let latest = null;
    for (const obs of observations) {
      const date = obs?.attributes?.[0]?.value;
      const value = obs?.attributes?.[1]?.value;
      if (date && value !== undefined) {
        const rate = parseFloat(value);
        if (!isNaN(rate)) {
          if (!latest || date > latest.date) {
            latest = { date, rate_pct: rate };
          }
        }
      }
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
