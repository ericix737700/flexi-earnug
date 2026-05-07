import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const MARZPAY_API_KEY = Deno.env.get("MARZPAY_API_KEY");
    const MARZPAY_API_SECRET = Deno.env.get("MARZPAY_API_SECRET");
    if (!MARZPAY_API_KEY || !MARZPAY_API_SECRET) {
      throw new Error("MARZPAY_API_KEY or MARZPAY_API_SECRET is not configured");
    }
    const credentials = btoa(`${MARZPAY_API_KEY}:${MARZPAY_API_SECRET}`);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { amount, phone_number, withdrawal_id } = await req.json();

    if (!amount || !phone_number || !withdrawal_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: must be either admin OR the owner of the withdrawal in automatic mode.
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const { data: withdrawal } = await adminClient
      .from("withdrawals")
      .select("id, user_id, status")
      .eq("id", withdrawal_id)
      .maybeSingle();

    if (!withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAdmin = !!roleData;
    const isOwner = withdrawal.user_id === userId;

    if (!isAdmin) {
      // Non-admin: only allowed when withdrawal_mode = automatic AND owner
      const { data: modeSetting } = await adminClient
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "withdrawal_mode")
        .maybeSingle();
      const mode = modeSetting?.setting_value || "manual";
      if (mode !== "automatic" || !isOwner) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (withdrawal.status !== "pending") {
      return new Response(JSON.stringify({ error: `Withdrawal is already ${withdrawal.status}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedPhone = phone_number.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+256" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+256" + formattedPhone;
    }

    const reference = crypto.randomUUID();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

    const response = await fetch("https://wallet.wearemarz.com/api/v1/send-money", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        phone_number: formattedPhone,
        country: "UG",
        reference,
        description: `Withdrawal ${withdrawal_id}`,
        callback_url: `${supabaseUrl}/functions/v1/marzpay-webhook`,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      console.error("MarzPay send error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Send money failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transactionUuid = data.data?.transaction?.uuid || null;

    // Mark withdrawal as approved (payout in flight) + record references
    await adminClient
      .from("withdrawals")
      .update({
        status: "approved",
        transaction_id: transactionUuid,
        marzpay_reference: reference,
        processed_by: userId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", withdrawal_id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_uuid: transactionUuid,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in marzpay-send:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
