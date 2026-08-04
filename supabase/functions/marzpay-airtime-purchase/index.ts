// Purchases airtime or a data bundle for the authenticated user, debiting their
// FlexiEarn balance. Prices come from the admin-configured override table when set.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://wallet.wearemarz.com/api/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function formatMsisdn(raw: string) {
  let d = String(raw).replace(/\D/g, "");
  if (d.startsWith("0")) d = "256" + d.slice(1);
  else if (!d.startsWith("256")) d = "256" + d;
  return d;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("MARZPAY_API_KEY");
    const SECRET = Deno.env.get("MARZPAY_API_SECRET");
    if (!KEY || !SECRET) throw new Error("MarzPay credentials not configured");

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ success: false, error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({} as any));
    const purchaseType = body.purchase_type === "bundle" ? "bundle" : "airtime";
    const msisdn = formatMsisdn(body.msisdn || "");
    if (msisdn.length < 12) return json({ success: false, error: "Invalid phone number" }, 400);

    // Resolve the price the user pays
    let price = 0;
    let label = "";
    let bundleId: string | undefined;

    if (purchaseType === "airtime") {
      price = Math.floor(Number(body.amount || 0));
      if (!Number.isFinite(price) || price < 500) {
        return json({ success: false, error: "Minimum airtime amount is UGX 500" }, 400);
      }
      label = `Airtime top-up ${msisdn}`;
    } else {
      bundleId = String(body.bundle_id || "");
      if (!bundleId) return json({ success: false, error: "bundle_id is required" }, 400);
      price = Math.floor(Number(body.price || 0));
      label = `${body.bundle_name || "Data bundle"} — ${msisdn}`;

      // Re-verify price server side against admin overrides / catalog
      const { data: row } = await admin
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "airtime_bundle_prices")
        .maybeSingle();
      if (row?.setting_value) {
        try {
          const overrides = JSON.parse(row.setting_value);
          if (overrides[bundleId] !== undefined) price = Math.floor(Number(overrides[bundleId]));
        } catch (_) { /* ignore */ }
      }
      if (!Number.isFinite(price) || price <= 0) {
        return json({ success: false, error: "Bundle price unavailable" }, 400);
      }
    }

    // Check balance & restrictions
    const { data: profile } = await admin
      .from("profiles")
      .select("balance, status, restrictions")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) return json({ success: false, error: "Profile not found" }, 404);
    if (profile.status !== "active") {
      return json({ success: false, error: "Your account is not active" }, 403);
    }
    if ((profile.restrictions as any)?.no_transactions) {
      return json({ success: false, error: "Transactions are restricted on your account" }, 403);
    }
    if (Number(profile.balance) < price) {
      return json({ success: false, error: "Insufficient balance" }, 400);
    }

    // Debit first
    const newBalance = Number(profile.balance) - price;
    const { error: debitErr } = await admin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", userId);
    if (debitErr) return json({ success: false, error: "Could not debit balance" }, 500);

    const reference = crypto.randomUUID();
    const credentials = btoa(`${KEY}:${SECRET}`);

    const payload: Record<string, unknown> = { reference, purchase_type: purchaseType, msisdn };
    if (purchaseType === "airtime") payload.amount = price;
    else payload.bundle_id = bundleId;

    let ok = false;
    let providerStatus = "failed";
    let errorMsg = "Purchase failed";

    try {
      const res = await fetch(`${BASE}/airtime-data`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({} as any));
      console.log("MarzPay airtime-data response:", res.status, JSON.stringify(data));
      providerStatus = data?.data?.status || (res.ok ? "completed" : "failed");
      ok = res.ok && data?.status === "success" && providerStatus !== "failed";
      if (!ok) errorMsg = data?.message || data?.error || `Purchase failed (HTTP ${res.status})`;
    } catch (e) {
      errorMsg = (e as Error).message;
    }

    if (!ok) {
      // Refund
      await admin.from("profiles").update({ balance: Number(profile.balance) }).eq("user_id", userId);
      return json({ success: false, error: errorMsg });
    }

    await admin.from("transactions").insert({
      user_id: userId,
      transaction_type: "purchase",
      amount: -price,
      balance_after: newBalance,
      description: label,
      reference_id: reference,
    });

    return json({
      success: true,
      reference,
      status: providerStatus,
      amount: price,
      balance: newBalance,
      pending: providerStatus === "pending",
    });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});
