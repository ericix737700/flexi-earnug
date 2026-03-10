import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("MarzPay webhook received:", JSON.stringify(payload));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const transactionUuid = payload.transaction?.uuid;
    const status = payload.transaction?.status;
    const eventType = payload.event_type;

    if (!transactionUuid) {
      return new Response(JSON.stringify({ error: "Missing transaction UUID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find the deposit by transaction_id
    const { data: deposit, error: findError } = await supabase
      .from("deposits")
      .select("*")
      .eq("transaction_id", transactionUuid)
      .single();

    if (findError || !deposit) {
      console.error("Deposit not found for transaction:", transactionUuid);
      return new Response(JSON.stringify({ error: "Deposit not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (deposit.status !== "pending") {
      return new Response(JSON.stringify({ message: "Already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (eventType === "collection.completed" || status === "completed") {
      // Approve the deposit
      await supabase
        .from("deposits")
        .update({ status: "approved", processed_at: new Date().toISOString() })
        .eq("id", deposit.id);

      // Credit user balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", deposit.user_id)
        .single();

      const newBalance = Number(profile?.balance || 0) + Number(deposit.amount);

      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", deposit.user_id);

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: deposit.user_id,
        transaction_type: "deposit",
        amount: deposit.amount,
        balance_after: newBalance,
        description: `Mobile Money deposit via MarzPay`,
        reference_id: deposit.id,
      });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: deposit.user_id,
        title: "Deposit Successful",
        message: `Your deposit of UGX ${Number(deposit.amount).toLocaleString()} has been credited to your account.`,
        notification_type: "deposit",
      });

      console.log(`Deposit ${deposit.id} approved, balance updated to ${newBalance}`);
    } else if (eventType === "collection.failed" || status === "failed") {
      await supabase
        .from("deposits")
        .update({
          status: "rejected",
          rejection_reason: "Payment failed or was declined",
          processed_at: new Date().toISOString(),
        })
        .eq("id", deposit.id);

      await supabase.from("notifications").insert({
        user_id: deposit.user_id,
        title: "Deposit Failed",
        message: `Your deposit of UGX ${Number(deposit.amount).toLocaleString()} failed. Please try again.`,
        notification_type: "deposit",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
