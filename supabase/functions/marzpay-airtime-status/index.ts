// Polls MarzPay for the delivery status of an airtime / data purchase and
// automatically refunds the user's balance when the provider reports a failure.
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

function normalizeStatus(raw: unknown): "pending" | "completed" | "failed" {
  const s = String(raw || "").toLowerCase();
  if (["success", "successful", "completed", "delivered", "processed"].includes(s)) return "completed";
  if (["failed", "failure", "cancelled", "canceled", "rejected", "reversed"].includes(s)) return "failed";
  return "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("MARZPAY_API_KEY");
    const SECRET = Deno.env.get("MARZPAY_API_SECRET");
    if (!KEY || !SECRET) throw new Error("MarzPay credentials not configured");

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!token) return json({ success: false, error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ success: false, error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const reference = String(body.reference || "");
    if (!reference) return json({ success: false, error: "reference is required" }, 400);

    // The purchase must belong to the caller
    const { data: purchaseTx } = await admin
      .from("transactions")
      .select("id, amount, description")
      .eq("user_id", userId)
      .eq("reference_id", reference)
      .maybeSingle();
    if (!purchaseTx) return json({ success: false, error: "Purchase not found" }, 404);

    // Already refunded?
    const { data: refundTx } = await admin
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("reference_id", `${reference}-refund`)
      .maybeSingle();
    if (refundTx) return json({ success: true, status: "refunded" });

    const credentials = btoa(`${KEY}:${SECRET}`);
    let providerStatus: "pending" | "completed" | "failed" = "pending";
    let message = "";

    for (const path of [`/airtime-data/${reference}`, `/transactions/${reference}`]) {
      try {
        const res = await fetch(`${BASE}${path}`, {
          headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
        });
        const data = await res.json().catch(() => ({} as Record<string, unknown>));
        if (!res.ok) continue;
        const d = (data as any)?.data ?? {};
        providerStatus = normalizeStatus(d.status ?? d.transaction_status ?? (data as any)?.status);
        message = (data as any)?.message || "";
        break;
      } catch (_) {
        /* try next path */
      }
    }

    if (providerStatus === "failed") {
      const refundAmount = Math.abs(Number(purchaseTx.amount) || 0);
      const { data: profile } = await admin
        .from("profiles")
        .select("balance")
        .eq("user_id", userId)
        .maybeSingle();
      const newBalance = Number(profile?.balance || 0) + refundAmount;

      await admin.from("profiles").update({ balance: newBalance }).eq("user_id", userId);
      await admin.from("transactions").insert({
        user_id: userId,
        transaction_type: "refund",
        amount: refundAmount,
        balance_after: newBalance,
        description: `Refund — ${purchaseTx.description || "airtime/data purchase"} failed`,
        reference_id: `${reference}-refund`,
      });

      return json({
        success: true,
        status: "refunded",
        refunded: refundAmount,
        balance: newBalance,
        message: message || "The provider could not deliver this purchase.",
      });
    }

    return json({ success: true, status: providerStatus, message });
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 200);
  }
});
