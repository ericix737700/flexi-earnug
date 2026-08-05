// Returns the server's VAPID public key so the browser always subscribes with
// the exact key the push sender uses (mismatched keys cause silent failures).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const key = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  return new Response(
    JSON.stringify({ success: !!key, publicKey: key }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
