import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status") }),
  z.object({ action: z.literal("set_pin"), pin: z.string().regex(/^\d{4}$/), current_pin: z.string().regex(/^\d{4}$/).optional() }),
  z.object({
    action: z.literal("withdraw"),
    pin: z.string().regex(/^\d{4}$/),
    amount: z.number().int().positive().max(100000000),
    phone_number: z.string().trim().min(9).max(16).regex(/^\+?[0-9 ]+$/),
    network: z.enum(["MTN", "Airtel"]),
    recipient_name: z.string().trim().min(2).max(120),
  }),
  z.object({
    action: z.literal("reject"),
    withdrawal_id: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
]);

const encoder = new TextEncoder();

async function derivePin(pin: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function secureEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Service unavailable" }, 503);

    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: authError } = await userClient.auth.getUser(authHeader.slice(7));
    if (authError || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;
    const admin = createClient(url, serviceKey);

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid request" }, 400);
    const body = parsed.data;

    if (body.action === "reject") {
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!role) return json({ error: "Admin access required" }, 403);
      const { data, error } = await admin.rpc("reject_secure_withdrawal", {
        _withdrawal_id: body.withdrawal_id,
        _admin_id: userId,
        _reason: body.reason,
      });
      if (error) return json({ error: error.message }, 400);
      return json(data);
    }

    const { data: pinRecord } = await admin
      .from("withdrawal_pins")
      .select("pin_hash, pin_salt, failed_attempts, locked_until")
      .eq("user_id", userId)
      .maybeSingle();

    if (body.action === "status") return json({ configured: Boolean(pinRecord) });

    const verifyPin = async (pin: string) => {
      if (!pinRecord) return { ok: false, error: "Set your FE PIN in Profile Settings first", status: 409 };
      if (pinRecord.locked_until && new Date(pinRecord.locked_until).getTime() > Date.now()) {
        return { ok: false, error: "FE PIN temporarily locked. Try again in 15 minutes", status: 423 };
      }
      const candidate = await derivePin(pin, base64ToBytes(pinRecord.pin_salt));
      if (!secureEqual(candidate, pinRecord.pin_hash)) {
        const attempts = Number(pinRecord.failed_attempts || 0) + 1;
        const locked = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
        await admin.from("withdrawal_pins").update({ failed_attempts: locked ? 0 : attempts, locked_until: locked }).eq("user_id", userId);
        return { ok: false, error: locked ? "Too many attempts. FE PIN locked for 15 minutes" : `Incorrect FE PIN. ${5 - attempts} attempts remaining`, status: 401 };
      }
      await admin.from("withdrawal_pins").update({ failed_attempts: 0, locked_until: null }).eq("user_id", userId);
      return { ok: true, error: "", status: 200 };
    };

    if (body.action === "set_pin") {
      if (pinRecord) {
        if (!body.current_pin) return json({ error: "Enter your current FE PIN" }, 400);
        const checked = await verifyPin(body.current_pin);
        if (!checked.ok) return json({ error: checked.error }, checked.status);
        if (body.current_pin === body.pin) return json({ error: "Choose a different FE PIN" }, 400);
      }
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const hash = await derivePin(body.pin, salt);
      const { error } = await admin.from("withdrawal_pins").upsert({
        user_id: userId,
        pin_hash: hash,
        pin_salt: bytesToBase64(salt),
        failed_attempts: 0,
        locked_until: null,
      });
      if (error) throw error;
      return json({ success: true, configured: true });
    }

    const checked = await verifyPin(body.pin);
    if (!checked.ok) return json({ error: checked.error }, checked.status);

    const { data, error } = await admin.rpc("create_secure_withdrawal", {
      _user_id: userId,
      _amount: body.amount,
      _phone_number: body.phone_number,
      _network: body.network,
      _recipient_name: body.recipient_name,
    });
    if (error) return json({ error: error.message }, 400);

    const { data: modeSetting } = await admin.from("platform_settings").select("setting_value").eq("setting_key", "withdrawal_mode").maybeSingle();
    return json({ ...data, automatic: modeSetting?.setting_value === "automatic" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
