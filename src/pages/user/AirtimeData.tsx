import { useEffect, useMemo, useRef, useState } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2, Signal, Smartphone, Wifi, BadgeCheck, ShieldCheck, RefreshCw,
  CheckCircle2, XCircle, Clock, RotateCcw, Zap,
} from "lucide-react";
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

type OrderStatus = "submitted" | "pending" | "completed" | "refunded" | "timeout";

interface Order {
  reference: string;
  label: string;
  amount: number;
  msisdn: string;
  status: OrderStatus;
  message?: string;
}

const QUICK_AIRTIME = [500, 1000, 2000, 5000, 10000, 20000];
const POLL_INTERVAL = 3000;
const MAX_POLLS = 40; // ~2 minutes

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
  const [order, setOrder] = useState<Order | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const pollRef = useRef<number | null>(null);

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

  const groupedBundles = useMemo(() => {
    const groups = new Map<string, Bundle[]>();
    for (const b of bundles) {
      const key = b.group || "Bundles";
      groups.set(key, [...(groups.get(key) || []), b]);
    }
    return [...groups.entries()];
  }, [bundles]);

  // ---- Status polling ------------------------------------------------------
  const stopPolling = () => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkStatus = async (reference: string) => {
    const { data, error } = await supabase.functions.invoke("marzpay-airtime-status", {
      body: { reference },
    });
    if (error || !data?.success) return;

    if (data.status === "completed") {
      stopPolling();
      setOrder((o) => (o ? { ...o, status: "completed" } : o));
      toast.success("Delivered successfully");
      refreshProfile();
    } else if (data.status === "refunded") {
      stopPolling();
      setOrder((o) =>
        o ? { ...o, status: "refunded", message: data.message || "Purchase failed — you were refunded" } : o
      );
      toast.error("Purchase failed — your balance was refunded");
      refreshProfile();
    }
  };

  useEffect(() => {
    if (!order || (order.status !== "submitted" && order.status !== "pending")) return;
    setPollCount(0);
    let count = 0;
    pollRef.current = window.setInterval(() => {
      count += 1;
      setPollCount(count);
      if (count > MAX_POLLS) {
        stopPolling();
        setOrder((o) => (o ? { ...o, status: "timeout" } : o));
        return;
      }
      checkStatus(order.reference);
    }, POLL_INTERVAL);
    return stopPolling;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.reference, order?.status === "submitted" || order?.status === "pending"]);

  const retryStatus = () => {
    if (!order) return;
    setOrder({ ...order, status: "pending" });
  };

  // ---- Actions -------------------------------------------------------------
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
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

      setOrder({
        reference: data.reference,
        label: mode === "airtime" ? `Airtime UGX ${Number(amount).toLocaleString()}` : selected?.name || "Data bundle",
        amount: price,
        msisdn: phone,
        status: data.pending ? "submitted" : "completed",
      });
      setConfirmOpen(false);
      setAmount("");
      setSelected(null);
      refreshProfile();
      if (!data.pending) toast.success("Purchase successful!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setSubmitting(false);
    }
  };

  const isPending = order?.status === "submitted" || order?.status === "pending";
  const progressValue = order
    ? order.status === "completed" || order.status === "refunded"
      ? 100
      : Math.min(90, 20 + pollCount * 4)
    : 0;

  return (
    <UserLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl border-0 gradient-primary p-5 text-primary-foreground">
          <div aria-hidden className="absolute -right-10 -top-12 h-36 w-36 rounded-full bg-primary-foreground/10 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="rounded-xl bg-primary-foreground/15 p-2.5">
              <Signal className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Airtime & Data</h1>
              <p className="text-xs opacity-90">Instant MTN & Airtel top-ups, paid from your wallet</p>
            </div>
          </div>
          <div className="relative mt-4 flex items-center gap-2 text-xs">
            <Zap className="h-3.5 w-3.5" />
            <span className="opacity-90">Balance</span>
            <span className="font-bold">UGX {Number(profile?.balance || 0).toLocaleString()}</span>
          </div>
        </div>

        {/* Order status */}
        {order && (
          <Card className="glass-card border-0 animate-in fade-in slide-in-from-top-2">
            <CardContent className="space-y-3 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{order.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {order.msisdn} · UGX {order.amount.toLocaleString()}
                  </p>
                </div>
                <StatusPill status={order.status} />
              </div>

              <Progress value={progressValue} className="h-1.5" />

              <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
                <Step label="Submitted" done />
                <Step label="Processing" done={order.status !== "submitted"} active={isPending} />
                <Step
                  label={order.status === "refunded" ? "Refunded" : "Delivered"}
                  done={order.status === "completed" || order.status === "refunded"}
                />
              </div>

              {order.status === "timeout" && (
                <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                  <p>
                    This is taking longer than usual. Airtel bundles can take a few minutes — check again or contact
                    support with reference <span className="font-mono">{order.reference.slice(0, 8)}</span>.
                  </p>
                  <Button size="sm" variant="outline" onClick={retryStatus}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Check again
                  </Button>
                </div>
              )}

              {order.status === "refunded" && (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {order.message} Your wallet has been credited back in full.
                </p>
              )}

              {order.status === "completed" && (
                <p className="rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
                  Delivered to {order.msisdn}. Thank you!
                </p>
              )}

              {!isPending && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setOrder(null)}>
                  Dismiss
                </Button>
              )}
            </CardContent>
          </Card>
        )}

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
                  className="h-12 text-lg font-semibold"
                />
                <div className="grid grid-cols-3 gap-2">
                  {QUICK_AIRTIME.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmount(String(a))}
                      className={`rounded-xl border px-2 py-2.5 text-sm font-semibold transition-all tap-pop ${
                        amount === String(a)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:bg-muted"
                      }`}
                    >
                      {a.toLocaleString()}
                    </button>
                  ))}
                </div>
                <Button className="h-11 w-full rounded-xl font-semibold" onClick={() => openConfirm("airtime")}>
                  Buy Airtime
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {network === "unknown" ? "All available bundles" : `${NETWORK_LABEL[network]} bundles`}
              </p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
                </div>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
                </div>
              </div>
            ) : bundles.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  {catalog?.error || "No data bundles available right now."}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Category tiles */}
                {groupedBundles.length > 1 && (
                  <div className="grid grid-cols-3 gap-2">
                    {groupedBundles.map(([group, items]) => (
                      <button
                        key={group}
                        type="button"
                        onClick={() => setActiveGroup(group)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all tap-pop ${
                          activeGroup === group
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:bg-muted/60"
                        }`}
                      >
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          activeGroup === group ? "bg-primary text-primary-foreground" : "bg-muted text-primary"
                        }`}>
                          <Wifi className="h-4 w-4" />
                        </span>
                        <span className="line-clamp-2 text-[11px] font-semibold leading-tight">{group}</span>
                        <span className="text-[10px] text-muted-foreground">{items.length} plans</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Bundle rows */}
                <div className="space-y-2">
                  {visibleBundles.map((b) => (
                    <button
                      key={b.bundle_id}
                      type="button"
                      onClick={() => openConfirm("bundle", b)}
                      className="flex w-full items-center gap-3 rounded-2xl border bg-card p-3.5 text-left shadow-sm transition-all tap-pop hover:border-primary/50 hover:shadow-md"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Wifi className="h-5 w-5 text-primary" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold leading-tight">{b.name}</span>
                        <span className="block truncate text-[11px] text-muted-foreground">
                          {b.description || "Data bundle"}
                        </span>
                        {b.validity && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            <Clock className="h-2.5 w-2.5" /> {b.validity}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-extrabold">
                          {Number(b.price).toLocaleString()}
                        </span>
                        <span className="block text-[10px] font-semibold text-muted-foreground">UGX</span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
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

function StatusPill({ status }: { status: OrderStatus }) {
  const map: Record<OrderStatus, { label: string; className: string; Icon: React.ElementType }> = {
    submitted: { label: "Submitted", className: "bg-amber-500/15 text-amber-600", Icon: Clock },
    pending: { label: "Processing", className: "bg-amber-500/15 text-amber-600", Icon: Loader2 },
    completed: { label: "Delivered", className: "bg-success/15 text-success", Icon: CheckCircle2 },
    refunded: { label: "Refunded", className: "bg-destructive/15 text-destructive", Icon: XCircle },
    timeout: { label: "Still pending", className: "bg-muted text-muted-foreground", Icon: Clock },
  };
  const { label, className, Icon } = map[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${className}`}>
      <Icon className={`h-3 w-3 ${status === "pending" ? "animate-spin" : ""}`} /> {label}
    </span>
  );
}

function Step({ label, done, active }: { label: string; done?: boolean; active?: boolean }) {
  return (
    <div className={`rounded-lg py-1 ${done ? "text-primary font-semibold" : active ? "text-foreground" : "text-muted-foreground"}`}>
      {label}
    </div>
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
