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

    // Try to find a deposit first; otherwise treat as a withdrawal payout
    const { data: deposit, error: findError } = await supabase
      .from("deposits")
      .select("*")
      .eq("transaction_id", transactionUuid)
      .maybeSingle();

    if (!deposit) {
      // Withdrawal payout webhook
      const { data: withdrawal } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("transaction_id", transactionUuid)
        .maybeSingle();

      if (!withdrawal) {
        console.error("No deposit or withdrawal for transaction:", transactionUuid);
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (withdrawal.status === "processed" || withdrawal.status === "rejected") {
        return new Response(JSON.stringify({ message: "Already finalized" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const isSuccess =
        eventType === "disbursement.completed" ||
        eventType === "send_money.completed" ||
        eventType === "withdrawal.completed" ||
        status === "completed" ||
        status === "successful";

      const isFailure =
        eventType === "disbursement.failed" ||
        eventType === "send_money.failed" ||
        eventType === "withdrawal.failed" ||
        status === "failed" ||
        status === "rejected";

      if (isSuccess) {
        await supabase
          .from("withdrawals")
          .update({ status: "processed", processed_at: new Date().toISOString() })
          .eq("id", withdrawal.id);

        await supabase.from("notifications").insert({
          user_id: withdrawal.user_id,
          title: "Withdrawal Sent",
          message: `Your withdrawal of UGX ${Number(withdrawal.amount).toLocaleString()} has been sent to ${withdrawal.network} ${withdrawal.phone_number}.`,
          notification_type: "transaction",
        });
      } else if (isFailure) {
        // Refund the user
        const { data: profileData } = await supabase
          .from("profiles")
          .select("balance")
          .eq("user_id", withdrawal.user_id)
          .single();

        const newBalance = Number(profileData?.balance || 0) + Number(withdrawal.amount);
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("user_id", withdrawal.user_id);

        await supabase.from("transactions").insert({
          user_id: withdrawal.user_id,
          transaction_type: "adjustment",
          amount: Number(withdrawal.amount),
          balance_after: newBalance,
          description: "Withdrawal failed at MarzPay - refunded",
        });

        await supabase
          .from("withdrawals")
          .update({
            status: "rejected",
            rejection_reason: "Payment failed at MarzPay",
            processed_at: new Date().toISOString(),
          })
          .eq("id", withdrawal.id);

        await supabase.from("notifications").insert({
          user_id: withdrawal.user_id,
          title: "Withdrawal Failed",
          message: `Your withdrawal of UGX ${Number(withdrawal.amount).toLocaleString()} failed and your balance has been refunded.`,
          notification_type: "transaction",
        });
      }

      return new Response(JSON.stringify({ success: true, kind: "withdrawal" }), {
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

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance, registration_paid")
        .eq("user_id", deposit.user_id)
        .single();

      const newBalance = Number(profile?.balance || 0) + Number(deposit.amount);

      // Check if this is a registration fee payment (user hasn't paid yet)
      const isRegistrationPayment = !profile?.registration_paid;

      const profileUpdate: Record<string, any> = { balance: newBalance };
      if (isRegistrationPayment) {
        profileUpdate.registration_paid = true;
        profileUpdate.status = "active";
      }

      await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("user_id", deposit.user_id);

      // Record transaction
      await supabase.from("transactions").insert({
        user_id: deposit.user_id,
        transaction_type: isRegistrationPayment ? "registration_fee" : "deposit",
        amount: deposit.amount,
        balance_after: newBalance,
        description: isRegistrationPayment
          ? "Registration fee paid via Mobile Money"
          : "Mobile Money deposit via MarzPay",
        reference_id: deposit.id,
      });

      // Handle referral bonus for registration payments
      if (isRegistrationPayment) {
        const { data: fullProfile } = await supabase
          .from("profiles")
          .select("referred_by, full_name, phone")
          .eq("user_id", deposit.user_id)
          .single();

        if (fullProfile?.referred_by) {
          // Get referral bonus from settings
          const { data: bonusSetting } = await supabase
            .from("platform_settings")
            .select("setting_value")
            .eq("setting_key", "referral_bonus")
            .single();

          const referralBonus = bonusSetting ? Number(bonusSetting.setting_value) : 1000;

          const { data: referrer } = await supabase
            .from("profiles")
            .select("user_id, balance")
            .eq("id", fullProfile.referred_by)
            .single();

          if (referrer) {
            const referrerNewBalance = Number(referrer.balance) + referralBonus;
            await supabase
              .from("profiles")
              .update({ balance: referrerNewBalance })
              .eq("id", fullProfile.referred_by);

            await supabase.from("transactions").insert({
              user_id: referrer.user_id,
              transaction_type: "referral_bonus",
              amount: referralBonus,
              balance_after: referrerNewBalance,
              description: `Referral bonus for ${fullProfile.full_name || fullProfile.phone}`,
            });
          }
        }
      }

      // Send notification
      await supabase.from("notifications").insert({
        user_id: deposit.user_id,
        title: isRegistrationPayment ? "Account Activated!" : "Deposit Successful",
        message: isRegistrationPayment
          ? "Your registration fee has been paid and your account is now active. Start earning!"
          : `Your deposit of UGX ${Number(deposit.amount).toLocaleString()} has been credited to your account.`,
        notification_type: "deposit",
      });

      console.log(`Deposit ${deposit.id} approved, balance updated to ${newBalance}${isRegistrationPayment ? ', account activated' : ''}`);
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
