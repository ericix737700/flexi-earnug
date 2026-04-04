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

    const { amount, phone_number, deposit_id } = await req.json();

    if (!amount || !phone_number || !deposit_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, phone_number, deposit_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number to include country code
    let formattedPhone = phone_number.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      formattedPhone = "+256" + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith("+")) {
      formattedPhone = "+256" + formattedPhone;
    }

    const reference = crypto.randomUUID();

    // Build the callback URL for webhooks
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const callbackUrl = `${supabaseUrl}/functions/v1/marzpay-webhook`;

    const response = await fetch("https://wallet.wearemarz.com/api/v1/collect-money", {
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
        description: `Deposit ${deposit_id}`,
        callback_url: callbackUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok || data.status === "error") {
      console.error("MarzPay API error:", data);
      return new Response(
        JSON.stringify({ error: data.message || "Payment request failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update deposit with MarzPay transaction reference
    const supabase = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("deposits")
      .update({
        transaction_id: data.data?.transaction?.uuid || reference,
      })
      .eq("id", deposit_id);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_uuid: data.data?.transaction?.uuid,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in marzpay-collect:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
