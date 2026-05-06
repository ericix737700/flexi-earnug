// Looks up the registered account holder name for a Uganda mobile number via MarzPay phone verification.
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
      throw new Error("MarzPay credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone_number } = await req.json();
    if (!phone_number || typeof phone_number !== "string") {
      return new Response(JSON.stringify({ success: false, error: "phone_number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // MarzPay expects format: 2567XXXXXXXX (no plus sign)
    let formatted = phone_number.replace(/\D/g, "");
    if (formatted.startsWith("0")) {
      formatted = "256" + formatted.substring(1);
    } else if (formatted.startsWith("+")) {
      formatted = formatted.substring(1);
    } else if (!formatted.startsWith("256")) {
      formatted = "256" + formatted;
    }

    if (formatted.length < 12) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(`${MARZPAY_API_KEY}:${MARZPAY_API_SECRET}`);

    const res = await fetch(
      "https://wallet.wearemarz.com/api/v1/phone-verification/verify",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ phone_number: formatted }),
      }
    );

    const data = await res.json().catch(() => ({} as any));
    console.log("MarzPay verify response:", res.status, JSON.stringify(data));

    if (res.ok && data?.success) {
      const name =
        data?.data?.full_name ||
        [data?.data?.first_name, data?.data?.last_name].filter(Boolean).join(" ").trim() ||
        data?.data?.name ||
        null;

      if (name) {
        return new Response(
          JSON.stringify({ success: true, name, phone_number: formatted }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const errorMsg =
      data?.message ||
      data?.error ||
      (res.status === 404
        ? "Phone number not registered on mobile money"
        : `Verification failed (HTTP ${res.status})`);

    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("marzpay-lookup-name error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || "Internal error" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
