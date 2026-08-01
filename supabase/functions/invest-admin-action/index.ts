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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ success: false, error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) return json({ success: false, error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleData } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin").maybeSingle();
    if (!roleData) return json({ success: false, error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const investmentId = String(body.investmentId ?? "");

    const creditBalance = async (userId: string, amount: number, type: string, description: string, refId: string) => {
      const { data: profile } = await admin.from("profiles").select("balance").eq("user_id", userId).maybeSingle();
      if (!profile) return null;
      const newBalance = Number(profile.balance) + amount;
      await admin.from("profiles").update({ balance: newBalance }).eq("user_id", userId);
      await admin.from("transactions").insert({
        user_id: userId,
        transaction_type: type,
        amount,
        balance_after: newBalance,
        description,
        reference_id: refId,
      });
      return newBalance;
    };

    if (action === "toggle_rewards_pause") {
      const paused = body.paused === true;
      const { data: existing } = await admin
        .from("platform_settings").select("id").eq("setting_key", "investment_rewards_paused").maybeSingle();
      if (existing) {
        await admin.from("platform_settings").update({ setting_value: String(paused) }).eq("setting_key", "investment_rewards_paused");
      } else {
        await admin.from("platform_settings").insert({ setting_key: "investment_rewards_paused", setting_value: String(paused) });
      }
      await admin.from("investment_audit_log").insert({
        actor_id: caller.id, action: "toggle_rewards_pause", details: { paused },
      });
      return json({ success: true, paused });
    }

    if (!/^[0-9a-f-]{36}$/i.test(investmentId)) return json({ success: false, error: "Invalid investment" }, 400);

    const { data: inv } = await admin.from("user_investments").select("*").eq("id", investmentId).maybeSingle();
    if (!inv) return json({ success: false, error: "Investment not found" }, 404);

    if (action === "complete") {
      if (inv.status !== "active") return json({ success: false, error: "Investment is not active" }, 400);
      await admin.from("user_investments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", inv.id).eq("status", "active");
      const reward = Number(inv.reward_amount);
      await creditBalance(inv.user_id, reward, "investment_reward", `Investment matured: ${inv.machine_name}`, inv.id);
      await admin.from("notifications").insert({
        user_id: inv.user_id,
        title: "Investment reward credited",
        message: `${inv.machine_name} completed. UGX ${reward.toLocaleString()} has been added to your wallet.`,
        notification_type: "investment",
      });
      await admin.from("investment_audit_log").insert({
        actor_id: caller.id, action: "admin_complete", investment_id: inv.id, machine_id: inv.machine_id, details: { reward },
      });
      return json({ success: true });
    }

    if (action === "cancel_refund") {
      if (inv.status !== "active") return json({ success: false, error: "Investment is not active" }, 400);
      await admin.from("user_investments")
        .update({ status: "refunded", completed_at: new Date().toISOString() })
        .eq("id", inv.id).eq("status", "active");
      const refund = Number(inv.amount_paid);
      await creditBalance(inv.user_id, refund, "refund", `Investment refunded: ${inv.machine_name}`, inv.id);
      await admin.from("notifications").insert({
        user_id: inv.user_id,
        title: "Investment refunded",
        message: `${inv.machine_name} was cancelled and UGX ${refund.toLocaleString()} was refunded to your wallet.`,
        notification_type: "investment",
      });
      await admin.from("investment_audit_log").insert({
        actor_id: caller.id, action: "admin_cancel_refund", investment_id: inv.id, machine_id: inv.machine_id, details: { refund },
      });
      return json({ success: true });
    }

    if (action === "cancel") {
      if (inv.status !== "active") return json({ success: false, error: "Investment is not active" }, 400);
      await admin.from("user_investments")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", inv.id).eq("status", "active");
      await admin.from("investment_audit_log").insert({
        actor_id: caller.id, action: "admin_cancel", investment_id: inv.id, machine_id: inv.machine_id, details: {},
      });
      return json({ success: true });
    }

    if (action === "adjust_reward") {
      const newReward = Number(body.rewardAmount);
      if (!Number.isFinite(newReward) || newReward < 0) return json({ success: false, error: "Invalid reward" }, 400);
      if (inv.status !== "active") return json({ success: false, error: "Only active investments can be adjusted" }, 400);
      await admin.from("user_investments").update({ reward_amount: newReward }).eq("id", inv.id);
      await admin.from("investment_audit_log").insert({
        actor_id: caller.id, action: "admin_adjust_reward", investment_id: inv.id, machine_id: inv.machine_id,
        details: { from: inv.reward_amount, to: newReward },
      });
      return json({ success: true });
    }

    return json({ success: false, error: "Unknown action" }, 400);
  } catch (e) {
    console.error("invest-admin-action error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
