import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Méthode non autorisée." }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Non authentifié." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { user_id } = await req.json();

  if (!user_id) {
    return jsonResponse({ error: "user_id est requis." }, 400);
  }

  const { error: permissionsError } = await supabaseAdmin
    .from("user_permissions")
    .delete()
    .eq("user_id", user_id);

  if (permissionsError) {
    return jsonResponse({ error: permissionsError.message }, 500);
  }

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .delete()
    .eq("id", user_id);

  if (profileError) {
    return jsonResponse({ error: profileError.message }, 500);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

  if (authError) {
    return jsonResponse({ error: authError.message }, 500);
  }

  return jsonResponse({ success: true });
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}
