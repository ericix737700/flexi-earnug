import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: settingsRows } = await admin
      .from("platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["investment_rewards_paused"]);
    const paused = settingsRows?.find((s) => s.setting_key === "investment_rewards_paused")?.setting_value === "true";
    if (paused) return json({ success: true, paused: true, processed: 0 });

    const { data: due } = await admin
      .from("user_investments")
      .select("*")
      .eq("status", "active")
      .lte("matures_at", new Date().toISOString())
      .limit(200);

    let processed = 0;

    for (const inv of due ?? []) {
      // Claim the row first (idempotent)
      const { data: claimed } = await admin
        .from("user_investments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", inv.id)
        .eq("status", "active")
        .select("id")
        .maybeSingle();
      if (!claimed) continue;

      const { data: profile } = await admin
        .from("profiles")
        .select("balance")
        .eq("user_id", inv.user_id)
        .maybeSingle();
      if (!profile) continue;

      const reward = Number(inv.reward_amount);
      const newBalance = Number(profile.balance) + reward;

      await admin.from("profiles").update({ balance: newBalance }).eq("user_id", inv.user_id);

      await admin.from("transactions").insert({
        user_id: inv.user_id,
        transaction_type: "investment_reward",
        amount: reward,
        balance_after: newBalance,
        description: `Investment matured: ${inv.machine_name}`,
        reference_id: inv.id,
      });

      await admin.from("notifications").insert({
        user_id: inv.user_id,
        title: "Investment reward credited",
        message: `${inv.machine_name} matured. UGX ${reward.toLocaleString()} has been added to your wallet.`,
        notification_type: "investment",
      });

      await admin.from("investment_audit_log").insert({
        action: "mature",
        investment_id: inv.id,
        machine_id: inv.machine_id,
        details: { reward, balance_after: newBalance },
      });

      processed++;
    }

    return json({ success: true, processed });
  } catch (e) {
    console.error("invest-mature error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
