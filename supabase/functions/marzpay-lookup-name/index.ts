// Looks up the registered account holder name for a mobile money number via MarzPay.
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { phone_number } = await req.json();
    if (!phone_number || typeof phone_number !== "string") {
      return new Response(JSON.stringify({ error: "phone_number is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formatted = phone_number.replace(/\D/g, "");
    if (formatted.startsWith("0")) {
      formatted = "+256" + formatted.substring(1);
    } else if (formatted.startsWith("256")) {
      formatted = "+" + formatted;
    } else if (!formatted.startsWith("+")) {
      formatted = "+256" + formatted;
    }

    if (formatted.length < 12) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const credentials = btoa(`${MARZPAY_API_KEY}:${MARZPAY_API_SECRET}`);

    // Try MarzPay account-holder lookup endpoints
    const endpoints = [
      "https://wallet.wearemarz.com/api/v1/get-account-name",
      "https://wallet.wearemarz.com/api/v1/account-holder",
    ];

    let lastError: any = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ phone_number: formatted, country: "UG" }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.status !== "error") {
          const name =
            data?.data?.account_name ||
            data?.data?.name ||
            data?.data?.holder_name ||
            data?.account_name ||
            data?.name ||
            null;
          if (name) {
            return new Response(
              JSON.stringify({ success: true, name, phone_number: formatted }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          lastError = data?.message || "Name not returned";
        } else {
          lastError = data?.message || `HTTP ${res.status}`;
        }
      } catch (e) {
        lastError = (e as Error).message;
      }
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: lastError
          ? `Name lookup unavailable: ${lastError}`
          : "Name lookup service unavailable",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("marzpay-lookup-name error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
