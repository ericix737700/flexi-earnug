import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return json({ error: "Unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const { full_name, phone, email, password } = body || {};

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Validate phone uniqueness if changed
    if (phone) {
      const cleaned = String(phone).replace(/\D/g, "");
      if (cleaned.length < 9) return json({ error: "Invalid phone number" }, 400);
      const newAuthEmail = `${cleaned}@flexiearn.ug`;

      // Check if another user already has this phone
      const { data: existing } = await admin
        .from("profiles")
        .select("user_id")
        .eq("phone", cleaned)
        .neq("user_id", userId)
        .maybeSingle();
      if (existing) return json({ error: "Phone number already in use" }, 400);

      const { error: e1 } = await admin.auth.admin.updateUserById(userId, { email: newAuthEmail, email_confirm: true });
      if (e1) return json({ error: e1.message }, 400);
      await admin.from("profiles").update({ phone: cleaned }).eq("user_id", userId);
    }

    if (password) {
      if (String(password).length < 6) return json({ error: "Password too short" }, 400);
      const { error: pErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (pErr) return json({ error: pErr.message }, 400);
    }

    const profileUpdate: any = {};
    if (typeof full_name === "string") profileUpdate.full_name = full_name.trim();
    if (typeof email === "string") {
      const e = email.trim().toLowerCase();
      if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return json({ error: "Invalid email" }, 400);
      profileUpdate.email = e || null;
    }
    if (Object.keys(profileUpdate).length) {
      await admin.from("profiles").update(profileUpdate).eq("user_id", userId);
    }

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
