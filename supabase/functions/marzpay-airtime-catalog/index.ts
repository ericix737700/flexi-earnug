// Fetches the MarzPay Airtime & Data catalog (networks + bundles) and merges
// admin price overrides stored in platform_settings.airtime_bundle_prices.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE = "https://wallet.wearemarz.com/api/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeItems(section: any): any[] {
  if (!section) return [];
  const groups = section.bundles ?? {};
  const out: any[] = [];
  for (const key of Object.keys(groups)) {
    const group = groups[key];
    const items = Array.isArray(group?.items) ? group.items : [];
    for (const it of items) {
      out.push({
        bundle_id: it.product_id ?? it.bundle_id ?? it.id,
        name: it.name ?? it.product_name ?? it.label ?? "Bundle",
        description: it.description ?? it.validity ?? "",
        validity: it.validity ?? it.period ?? "",
        cost: Number(it.price ?? it.amount ?? 0),
        group: group?.label ?? key,
      });
    }
  }
  return out.filter((b) => b.bundle_id);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const KEY = Deno.env.get("MARZPAY_API_KEY");
    const SECRET = Deno.env.get("MARZPAY_API_SECRET");
    if (!KEY || !SECRET) throw new Error("MarzPay credentials not configured");
    const credentials = btoa(`${KEY}:${SECRET}`);

    const res = await fetch(`${BASE}/airtime-data/catalog`, {
      headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
    });
    const data = await res.json().catch(() => ({} as any));

    if (!res.ok || data?.status !== "success") {
      return json(
        { success: false, error: data?.message || `Catalog unavailable (HTTP ${res.status})`, bundles: { mtn: [], airtel: [] } },
        200,
      );
    }

    const catalog = data.data ?? {};
    const bundles = {
      mtn: normalizeItems(catalog.mtn),
      airtel: normalizeItems(catalog.airtel),
    };

    // Merge admin price overrides
    let overrides: Record<string, number> = {};
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: row } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "airtime_bundle_prices")
        .maybeSingle();
      if (row?.setting_value) overrides = JSON.parse(row.setting_value);
    } catch (_) { /* overrides are optional */ }

    for (const net of ["mtn", "airtel"] as const) {
      bundles[net] = bundles[net].map((b: any) => ({
        ...b,
        price: Number(overrides[b.bundle_id] ?? b.cost),
        overridden: overrides[b.bundle_id] !== undefined,
      }));
    }

    return json({
      success: true,
      networks: catalog.networks ?? [],
      currency: catalog.currency ?? "UGX",
      bundles,
    });
  } catch (e) {
    return json({ success: false, error: (e as Error).message, bundles: { mtn: [], airtel: [] } }, 200);
  }
});
