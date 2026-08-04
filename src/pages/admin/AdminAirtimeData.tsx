import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, RefreshCw, Signal, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";

type Bundle = {
  bundle_id: string;
  name: string;
  description?: string;
  validity?: string;
  group?: string;
  cost: number;
  price: number;
};

export default function AdminAirtimeData() {
  const { data: settings, refetch: refetchSettings } = usePlatformSettings();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-airtime-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("marzpay-airtime-catalog");
      if (error) throw error;
      return data as { success: boolean; error?: string; bundles: { mtn: Bundle[]; airtel: Bundle[] } };
    },
  });

  useEffect(() => {
    if (!settings?.airtime_bundle_prices) return;
    try {
      const parsed = JSON.parse(settings.airtime_bundle_prices) as Record<string, number>;
      setPrices(Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)])));
    } catch {
      /* ignore malformed */
    }
  }, [settings?.airtime_bundle_prices]);

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, number> = {};
      for (const [id, val] of Object.entries(prices)) {
        const n = Number(val);
        if (val !== "" && Number.isFinite(n) && n > 0) payload[id] = Math.floor(n);
      }
      const { error } = await supabase
        .from("platform_settings")
        .upsert(
          { setting_key: "airtime_bundle_prices", setting_value: JSON.stringify(payload) },
          { onConflict: "setting_key" },
        );
      if (error) throw error;
      toast.success("Bundle prices saved");
      refetchSettings();
      refetch();
    } catch (e: any) {
      toast.error(e?.message || "Could not save prices");
    } finally {
      setSaving(false);
    }
  };

  const renderList = (list: Bundle[]) => (
    <div className="space-y-2">
      {list.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {data?.error || "No bundles returned by the provider."}
        </p>
      )}
      {list.map((b) => (
        <div key={b.bundle_id} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{b.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[b.group, b.validity, b.description].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px]">Cost UGX {Number(b.cost).toLocaleString()}</Badge>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Sell</span>
            <Input
              className="h-8 w-28"
              inputMode="numeric"
              placeholder={String(b.cost)}
              value={prices[b.bundle_id] ?? ""}
              onChange={(e) =>
                setPrices((p) => ({ ...p, [b.bundle_id]: e.target.value.replace(/\D/g, "") }))
              }
            />
            {prices[b.bundle_id] && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPrices((p) => { const n = { ...p }; delete n[b.bundle_id]; return n; })}
                aria-label="Reset to provider price"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const mtn = useMemo(() => data?.bundles?.mtn || [], [data]);
  const airtel = useMemo(() => data?.bundles?.airtel || [], [data]);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold">Airtime & Data</h1>
            <p className="text-sm text-muted-foreground">Set the selling price for each bundle. Empty means the provider price is used.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save prices
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Signal className="h-5 w-5 text-primary" /> Bundle catalog
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <Tabs defaultValue="mtn">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="mtn">MTN ({mtn.length})</TabsTrigger>
                  <TabsTrigger value="airtel">Airtel ({airtel.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="mtn" className="mt-4">{renderList(mtn)}</TabsContent>
                <TabsContent value="airtel" className="mt-4">{renderList(airtel)}</TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
