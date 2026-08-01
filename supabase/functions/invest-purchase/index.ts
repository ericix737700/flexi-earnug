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
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ success: false, error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const machineId = typeof body.machineId === "string" ? body.machineId : "";
    if (!/^[0-9a-f-]{36}$/i.test(machineId)) {
      return json({ success: false, error: "Invalid machine" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Feature flag
    const { data: settingsRows } = await admin
      .from("platform_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["feature_machines_status"]);
    const featureStatus = settingsRows?.find((s) => s.setting_key === "feature_machines_status")?.setting_value ?? "coming_soon";
    if (featureStatus !== "active") {
      return json({ success: false, error: "Investment Machines are not available yet" }, 403);
    }

    // Profile / restrictions
    const { data: profile } = await admin
      .from("profiles")
      .select("id, balance, status, restrictions")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!profile) return json({ success: false, error: "Profile not found" }, 404);
    if (profile.status !== "active") {
      return json({ success: false, error: "Your account is not active" }, 403);
    }
    if ((profile.restrictions as Record<string, boolean> | null)?.no_transactions) {
      return json({ success: false, error: "Transactions are restricted on your account" }, 403);
    }

    const { data: machine } = await admin
      .from("investment_machines")
      .select("*")
      .eq("id", machineId)
      .maybeSingle();
    if (!machine || !machine.is_visible) return json({ success: false, error: "Machine not found" }, 404);
    if (machine.status !== "active") {
      return json({ success: false, error: `This machine is ${String(machine.status).replace("_", " ")}` }, 400);
    }
    if (machine.max_total > 0 && machine.purchases_count >= machine.max_total) {
      return json({ success: false, error: "This machine is sold out" }, 400);
    }
    if (machine.max_per_user > 0) {
      const { count } = await admin
        .from("user_investments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("machine_id", machine.id)
        .in("status", ["active", "completed"]);
      if ((count ?? 0) >= machine.max_per_user) {
        return json({ success: false, error: "You reached the purchase limit for this machine" }, 400);
      }
    }

    const price = Number(machine.price);
    const balance = Number(profile.balance);
    if (balance < price) {
      return json({ success: false, error: "Insufficient wallet balance" }, 400);
    }

    const newBalance = balance - price;
    const { error: balErr } = await admin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", user.id)
      .eq("balance", profile.balance);
    if (balErr) throw balErr;

    const maturesAt = new Date(Date.now() + machine.duration_hours * 3600 * 1000).toISOString();

    const { data: investment, error: invErr } = await admin
      .from("user_investments")
      .insert({
        user_id: user.id,
        machine_id: machine.id,
        machine_name: machine.name,
        amount_paid: price,
        reward_amount: Number(machine.reward_amount),
        matures_at: maturesAt,
      })
      .select()
      .single();
    if (invErr) {
      // roll back the debit
      await admin.from("profiles").update({ balance }).eq("user_id", user.id);
      throw invErr;
    }

    await admin.from("transactions").insert({
      user_id: user.id,
      transaction_type: "investment",
      amount: -price,
      balance_after: newBalance,
      description: `Investment: ${machine.name}`,
      reference_id: investment.id,
    });

    await admin
      .from("investment_machines")
      .update({ purchases_count: machine.purchases_count + 1 })
      .eq("id", machine.id);

    await admin.from("investment_audit_log").insert({
      actor_id: user.id,
      action: "purchase",
      investment_id: investment.id,
      machine_id: machine.id,
      details: { price, reward: machine.reward_amount, matures_at: maturesAt },
    });

    await admin.from("notifications").insert({
      user_id: user.id,
      title: "Investment started",
      message: `You purchased ${machine.name} for UGX ${price.toLocaleString()}. Reward of UGX ${Number(machine.reward_amount).toLocaleString()} matures soon.`,
      notification_type: "investment",
    });

    return json({ success: true, investment, balance: newBalance });
  } catch (e) {
    console.error("invest-purchase error", e);
    return json({ success: false, error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
