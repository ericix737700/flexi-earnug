import { useEffect, useMemo, useState } from "react";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMachinesFeature } from "@/hooks/useMachinesFeature";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { Cpu, Clock, TrendingUp, Loader2, Sparkles, Wallet, ShieldCheck, CheckCircle2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { EmptyState } from "@/components/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";


type Machine = {
  id: string;
  name: string;
  series: string | null;
  description: string | null;
  image_url: string | null;
  price: number;
  reward_amount: number;
  duration_hours: number;
  status: "active" | "coming_soon" | "sold_out" | "disabled";
  max_per_user: number;
  max_total: number;
  purchases_count: number;
};

type Investment = {
  id: string;
  machine_name: string;
  amount_paid: number;
  reward_amount: number;
  status: string;
  starts_at: string;
  matures_at: string;
  completed_at: string | null;
};

function formatDuration(hours: number) {
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round((hours / 24) * 10) / 10;
  return `${days} day${days === 1 ? "" : "s"}`;
}

function Countdown({ to }: { to: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, new Date(to).getTime() - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  if (diff === 0) return <span className="font-semibold text-success">Maturing…</span>;
  return (
    <span className="font-mono font-semibold tabular-nums">
      {d > 0 ? `${d}d ` : ""}{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}

const statusLabel: Record<string, string> = {
  active: "Available",
  coming_soon: "Coming Soon",
  sold_out: "Sold Out",
  disabled: "Unavailable",
};

export default function Machines() {
  const { profile, refreshProfile } = useAuth();
  const feature = useMachinesFeature();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Machine | null>(null);
  const [buying, setBuying] = useState(false);

  const { data: machines, isLoading } = useQuery({
    queryKey: ["investment-machines"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investment_machines")
        .select("*")
        .eq("is_visible", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Machine[];
    },
  });

  const { data: investments } = useQuery({
    queryKey: ["my-investments", profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Investment[];
    },
    enabled: !!profile?.user_id,
  });

  useEffect(() => {
    if (!profile?.user_id) return;
    const channel = supabase
      .channel("investments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_investments", filter: `user_id=eq.${profile.user_id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["my-investments"] });
          refreshProfile();
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id, queryClient, refreshProfile]);

  const activeInvestments = useMemo(
    () => (investments || []).filter((i) => i.status === "active"),
    [investments]
  );
  const pastInvestments = useMemo(
    () => (investments || []).filter((i) => i.status !== "active"),
    [investments]
  );

  const handlePurchase = async () => {
    if (!selected) return;
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("invest-purchase", {
        body: { machineId: selected.id },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Purchase failed");
      toast.success(`${selected.name} started! Your reward will be credited automatically.`);
      setSelected(null);
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["my-investments"] });
      queryClient.invalidateQueries({ queryKey: ["investment-machines"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setBuying(false);
    }
  };

  const balance = Number(profile?.balance || 0);
  const canAfford = selected ? balance >= Number(selected.price) : false;

  const totalInvested = activeInvestments.reduce((s, i) => s + Number(i.amount_paid), 0);
  const expectedReturns = activeInvestments.reduce((s, i) => s + Number(i.reward_amount), 0);

  return (
    <UserLayout>
      <SEO
        title="Investment Machines | FlexiEarn"
        description="Buy an investment machine with your FlexiEarn wallet and earn an automatic reward when it matures."
      />
      <div className="space-y-5">
        {/* Hero */}
        <Card className="relative overflow-hidden border-0 shadow-md glow-primary">
          <div className="relative gradient-primary p-4">
            <div aria-hidden className="absolute -top-12 -right-10 h-36 w-36 rounded-full bg-secondary/30 blur-2xl" />
            <div aria-hidden className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-primary-foreground/20 p-2 backdrop-blur">
                  <Cpu className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-primary-foreground">Investment Machines</h1>
                  <p className="text-xs text-primary-foreground/80">
                    Invest once. Your reward is credited automatically at maturity.
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-primary-foreground/12 p-2.5 text-center backdrop-blur border border-primary-foreground/15">
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Running</p>
                  <p className="text-sm font-bold text-primary-foreground">{activeInvestments.length}</p>
                </div>
                <div className="border-x border-primary-foreground/20">
                  <p className="text-[10px] text-primary-foreground/70">Invested</p>
                  <p className="text-sm font-bold text-primary-foreground">
                    UGX {totalInvested.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-primary-foreground/70">Expected</p>
                  <p className="text-sm font-bold text-primary-foreground">
                    UGX {expectedReturns.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {feature.isComingSoon ? (
          <Card className="glass-card border-0">
            <CardContent className="py-10 text-center">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-secondary" />
              <h2 className="text-lg font-bold">Coming Soon</h2>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Investment Machines are almost ready. You'll be notified the moment they go live.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="machines">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="machines">Machines</TabsTrigger>
              <TabsTrigger value="mine">
                My Investments{activeInvestments.length > 0 ? ` (${activeInvestments.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="machines" className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                      <Skeleton className="aspect-square w-full rounded-none" />
                      <div className="space-y-2 p-3">
                        <Skeleton className="h-3.5 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-9 w-full rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (machines || []).length === 0 ? (
                <EmptyState icon={<Cpu className="h-8 w-8" />} title="No machines yet" description="Check back soon for new investment plans." />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(machines || []).map((m) => {
                    const soldOut =
                      m.status === "sold_out" || (m.max_total > 0 && m.purchases_count >= m.max_total);
                    const buyable = m.status === "active" && !soldOut;
                    const price = Number(m.price);
                    const reward = Number(m.reward_amount);
                    const roi = price > 0 ? Math.round(((reward - price) / price) * 100) : 0;
                    const days = Math.max(1, Math.round(m.duration_hours / 24));
                    const daily = Math.round(reward / days);
                    const soldPct = m.max_total > 0
                      ? Math.min(100, Math.round((m.purchases_count / m.max_total) * 100))
                      : 0;
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all ${
                          buyable ? "hover:shadow-md active:scale-[0.99]" : "opacity-60"
                        }`}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-muted">
                          {m.image_url ? (
                            <img
                              src={m.image_url}
                              alt={`${m.name} investment machine`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center gradient-primary">
                              <Cpu className="h-10 w-10 text-primary-foreground/80" />
                            </div>
                          )}
                          <span className="absolute left-2 top-2 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
                            {days} day{days === 1 ? "" : "s"}
                          </span>
                          {roi > 0 && (
                            <span className="absolute right-2 top-2 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-secondary-foreground shadow">
                              +{roi}%
                            </span>
                          )}
                          {!buyable && (
                            <span className="absolute bottom-2 left-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-semibold">
                              {soldOut ? "Sold Out" : statusLabel[m.status]}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-1.5 p-3">
                          <p className="line-clamp-2 text-sm font-semibold leading-snug">{m.name}</p>
                          {m.series && (
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.series}</p>
                          )}
                          <div className="mt-0.5 space-y-0.5 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Daily income</span>
                              <span className="font-semibold">{daily.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Total income</span>
                              <span className="font-semibold text-success">{reward.toLocaleString()}</span>
                            </div>
                          </div>
                          <p className="mt-1 text-base font-extrabold leading-none">
                            UGX {price.toLocaleString()}
                          </p>
                          {m.max_total > 0 && (
                            <div className="mt-0.5">
                              <Progress value={soldPct} className="h-1" />
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {m.purchases_count}/{m.max_total} taken
                              </p>
                            </div>
                          )}
                          <Button
                            disabled={!buyable}
                            onClick={() => setSelected(m)}
                            size="sm"
                            className="mt-auto w-full rounded-lg tap-pop"
                          >
                            {buyable ? "Invest" : statusLabel[soldOut ? "sold_out" : m.status]}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="mt-4 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                <ShieldCheck className="h-3 w-3 text-primary" />
                Rewards are credited automatically at maturity
              </p>
            </TabsContent>



            <TabsContent value="mine" className="mt-4 space-y-3">
              {activeInvestments.length === 0 && pastInvestments.length === 0 ? (
                <EmptyState icon={<Wallet className="h-8 w-8" />} title="No investments yet" description="Pick a machine to start earning." />
              ) : null}

              {activeInvestments.map((inv) => {
                const start = new Date(inv.starts_at).getTime();
                const end = new Date(inv.matures_at).getTime();
                const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
                return (
                  <Card key={inv.id} className="glass-card border-0">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-bold">{inv.machine_name}</p>
                          <p className="text-xs text-muted-foreground">
                            Invested UGX {Number(inv.amount_paid).toLocaleString()} · matures{" "}
                            {new Date(inv.matures_at).toLocaleDateString("en-UG", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Badge className="shrink-0 bg-primary/15 text-primary">Running</Badge>
                      </div>
                      <Progress value={pct} className="mt-3 h-2" />
                      <div className="mt-1 text-right text-[10px] text-muted-foreground">
                        {Math.round(pct)}% complete
                      </div>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-muted/40 px-3 py-2 text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" /> <Countdown to={inv.matures_at} />
                        </span>
                        <span className="font-semibold text-success">
                          Payout +UGX {Number(inv.reward_amount).toLocaleString()}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {pastInvestments.length > 0 && (
                <>
                  <p className="pt-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    History
                  </p>
                  <div className="overflow-hidden rounded-2xl border bg-card divide-y">
                    {pastInvestments.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between gap-3 p-3.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={`rounded-full p-2 ${inv.status === "completed" ? "bg-success/15" : "bg-muted"}`}>
                            <CheckCircle2 className={`h-4 w-4 ${inv.status === "completed" ? "text-success" : "text-muted-foreground"}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{inv.machine_name}</p>
                            <p className="text-[11px] capitalize text-muted-foreground">
                              {inv.status}
                              {inv.completed_at ? ` · ${new Date(inv.completed_at).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        </div>
                        <p className={`shrink-0 text-sm font-bold ${inv.status === "completed" ? "text-success" : "text-muted-foreground"}`}>
                          {inv.status === "completed"
                            ? `+UGX ${Number(inv.reward_amount).toLocaleString()}`
                            : `UGX ${Number(inv.amount_paid).toLocaleString()}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm investment</DialogTitle>
            <DialogDescription>Review the details before confirming.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Machine</span><span className="font-semibold">{selected.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-semibold">UGX {Number(selected.price).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">{formatDuration(selected.duration_hours)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Reward</span><span className="font-semibold text-success">UGX {Number(selected.reward_amount).toLocaleString()}</span></div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completes</span>
                <span className="font-semibold">
                  {new Date(Date.now() + selected.duration_hours * 3600000).toLocaleString()}
                </span>
              </div>
              {!canAfford && (
                <p className="pt-1 text-xs font-medium text-destructive">
                  Insufficient balance.{" "}
                  <Link to="/wallet" className="underline">Deposit funds</Link>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={buying}>Cancel</Button>
            <Button onClick={handlePurchase} disabled={buying || !canAfford}>
              {buying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Pay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
