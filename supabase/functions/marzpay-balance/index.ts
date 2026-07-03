// Fetch the MarzPay wallet balance for admin display.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("MARZPAY_API_KEY");
    const SECRET = Deno.env.get("MARZPAY_API_SECRET");
    if (!KEY || !SECRET) throw new Error("MarzPay credentials not configured");
    const credentials = btoa(`${KEY}:${SECRET}`);

    // Try both common endpoints — first success wins.
    const endpoints = [
      "https://wallet.wearemarz.com/api/v1/balance",
      "https://wallet.wearemarz.com/api/v1/account/balance",
      "https://wallet.wearemarz.com/api/v1/account",
    ];

    let last: any = null;
    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => ({}));
        last = { url, status: res.status, data };
        if (res.ok && data && (data.data || data.balance !== undefined || data.status === "success")) {
          // Try to normalize various shapes
          const raw = data.data || data;
          const balance =
            Number(raw.balance ?? raw.available_balance ?? raw.wallet?.balance ?? raw.amount ?? 0);
          const currency = raw.currency || raw.wallet?.currency || "UGX";
          return json({ success: true, balance, currency, raw: data });
        }
      } catch (e) {
        last = { url, error: (e as Error).message };
      }
    }
    return json({ success: false, error: "Could not fetch balance from MarzPay", detail: last }, 502);
  } catch (e) {
    return json({ success: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
