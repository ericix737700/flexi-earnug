import { useMemo, useState } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, Signal, Smartphone, Wifi, BadgeCheck, ShieldCheck, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { detectNetwork, NETWORK_LABEL } from "@/lib/network";

type Bundle = {
  bundle_id: string;
  name: string;
  description?: string;
  validity?: string;
  group?: string;
  cost: number;
  price: number;
};

const QUICK_AIRTIME = [500, 1000, 2000, 5000, 10000, 20000];

export default function AirtimeData() {
  const { profile, refreshProfile } = useAuth();
  const [phone, setPhone] = useState(profile?.phone || "");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [amount, setAmount] = useState("");
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mode, setMode] = useState<"airtime" | "bundle">("airtime");
  const [submitting, setSubmitting] = useState(false);

  const network = detectNetwork(phone);

  const { data: catalog, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["airtime-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("marzpay-airtime-catalog");
      if (error) throw error;
      return data as { success: boolean; error?: string; bundles: { mtn: Bundle[]; airtel: Bundle[] } };
    },
    staleTime: 5 * 60 * 1000,
  });

  const bundles = useMemo(() => {
    if (!catalog?.bundles) return [] as Bundle[];
    if (network === "airtel") return catalog.bundles.airtel || [];
    if (network === "mtn") return catalog.bundles.mtn || [];
    return [...(catalog.bundles.mtn || []), ...(catalog.bundles.airtel || [])];
  }, [catalog, network]);

  const handlePhoneChange = (v: string) => {
    setPhone(v);
    setVerifiedName(null);
  };

  const verify = async () => {
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      toast.error("Enter a valid phone number");
      return;
    }
    setVerifying(true);
    setVerifiedName(null);
    try {
      const { data, error } = await supabase.functions.invoke("marzpay-lookup-name", {
        body: { phone_number: phone },
      });
      if (error) throw error;
      if (data?.success && data.name) {
        setVerifiedName(data.name);
        toast.success("Number verified");
      } else {
        toast.error(data?.error || "Could not verify this number");
      }
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const openConfirm = (kind: "airtime" | "bundle", bundle?: Bundle) => {
    if (!verifiedName) {
      toast.error("Verify the phone number first");
      return;
    }
    if (kind === "airtime") {
      const amt = Number(amount);
      if (!amt || amt < 500) {
        toast.error("Minimum airtime is UGX 500");
        return;
      }
    }
    setMode(kind);
    setSelected(bundle || null);
    setConfirmOpen(true);
  };

  const price = mode === "airtime" ? Number(amount || 0) : Number(selected?.price || 0);

  const purchase = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("marzpay-airtime-purchase", {
        body:
          mode === "airtime"
            ? { purchase_type: "airtime", msisdn: phone, amount: Number(amount) }
            : {
                purchase_type: "bundle",
                msisdn: phone,
                bundle_id: selected?.bundle_id,
                bundle_name: selected?.name,
                price: selected?.price,
              },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Purchase failed");
        return;
      }
      toast.success(data.pending ? "Purchase submitted — delivery in progress" : "Purchase successful!");
      setConfirmOpen(false);
      setAmount("");
      setSelected(null);
      refreshProfile();
    } catch (e: any) {
      toast.error(e?.message || "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UserLayout>
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-primary/15 p-2">
            <Signal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Airtime & Data</h1>
            <p className="text-xs text-muted-foreground">Top up any MTN, Airtel or Lyca line instantly</p>
          </div>
        </div>

        {/* Recipient */}
        <Card className="glass-card border-0">
          <CardContent className="space-y-3 py-4">
            <Label>Recipient phone number</Label>
            <div className="flex gap-2">
              <Input
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="0771234567"
                inputMode="tel"
                disabled={verifying}
              />
              <Button onClick={verify} disabled={verifying} className="shrink-0">
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {network !== "unknown" && (
                <Badge variant="outline" className="text-[10px]">{NETWORK_LABEL[network]}</Badge>
              )}
              {verifiedName && (
                <span className="flex items-center gap-1 text-xs font-semibold text-success">
                  <BadgeCheck className="h-4 w-4" /> {verifiedName}
                </span>
              )}
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> We confirm the registered account holder before any purchase.
            </p>
          </CardContent>
        </Card>

        <Tabs defaultValue="airtime">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="airtime"><Smartphone className="mr-1.5 h-4 w-4" />Airtime</TabsTrigger>
            <TabsTrigger value="data"><Wifi className="mr-1.5 h-4 w-4" />Data</TabsTrigger>
          </TabsList>

          <TabsContent value="airtime" className="mt-4 space-y-3">
            <Card className="glass-card border-0">
              <CardContent className="space-y-3 py-4">
                <Label>Amount (UGX)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                  placeholder="1000"
                  inputMode="numeric"
                />
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AIRTIME.map((a) => (
                    <Button key={a} type="button" variant="outline" size="sm" onClick={() => setAmount(String(a))}>
                      {a.toLocaleString()}
                    </Button>
                  ))}
                </div>
                <Button className="w-full" onClick={() => openConfirm("airtime")}>
                  Buy Airtime
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {network === "unknown" ? "All available bundles" : `${NETWORK_LABEL[network]} bundles`}
              </p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : bundles.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {catalog?.error || "No data bundles available right now."}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {bundles.map((b) => (
                  <Card key={b.bundle_id} className="glass-card border-0 tap-pop">
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{b.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {[b.group, b.validity, b.description].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-bold text-primary">UGX {Number(b.price).toLocaleString()}</p>
                        <Button size="sm" className="mt-1 h-7 px-3 text-xs" onClick={() => openConfirm("bundle", b)}>
                          Buy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="glass-card border-0">
          <DialogHeader>
            <DialogTitle>Confirm purchase</DialogTitle>
            <DialogDescription>Please review the details before paying from your balance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl border p-3 text-sm">
            <Line label="Recipient" value={phone} />
            <Line label="Account holder" value={verifiedName || "—"} />
            <Line label="Network" value={NETWORK_LABEL[network]} />
            <Line label="Product" value={mode === "airtime" ? "Airtime top-up" : selected?.name || ""} />
            <Line label="Amount" value={`UGX ${price.toLocaleString()}`} />
            <Line label="Balance after" value={`UGX ${Math.max(0, Number(profile?.balance || 0) - price).toLocaleString()}`} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={purchase} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Confirm & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
