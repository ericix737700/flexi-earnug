// Captures IP, coarse geo (ipapi.co), user-agent and fingerprint for a login/signup.
// Called from the client immediately after a successful auth. Non-blocking.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const event_type = body.event_type === "signup" ? "signup" : "login";
    const device_fingerprint: string | null = body.device_fingerprint || null;

    // Real client IP: prefer x-forwarded-for
    const xff = req.headers.get("x-forwarded-for") || "";
    const ip = (xff.split(",")[0] || req.headers.get("cf-connecting-ip") || "").trim() || null;
    const user_agent = req.headers.get("user-agent") || null;

    // Geo lookup (best-effort, silent on failure)
    let country: string | null = null;
    let region: string | null = null;
    let city: string | null = null;
    let isp: string | null = null;
    if (ip) {
      try {
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`, {
          headers: { "User-Agent": "flexi-earn/1.0" },
        });
        if (geoRes.ok) {
          const g = await geoRes.json();
          country = g.country_name || null;
          region = g.region || null;
          city = g.city || null;
          isp = g.org || null;
        }
      } catch { /* ignore */ }
    }

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { error } = await admin.from("login_audit").insert({
      user_id: u.user.id,
      event_type,
      ip_address: ip,
      country, region, city, isp,
      user_agent, device_fingerprint,
    });
    if (error) return json({ error: error.message }, 500);

    return json({ success: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
