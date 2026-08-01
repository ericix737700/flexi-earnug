import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MoreVertical, TrendingUp, Wallet, Activity, Search } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  machine_id: string;
  machine_name: string;
  amount_paid: number;
  reward_amount: number;
  status: string;
  starts_at: string;
  matures_at: string;
  completed_at: string | null;
};

export default function AdminInvestments() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: settings } = useQuery({
    queryKey: ["investment-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("setting_key, setting_value")
        .eq("setting_key", "investment_rewards_paused")
        .maybeSingle();
      return data;
    },
  });
  const paused = settings?.setting_value === "true";

  const { data: investments, isLoading } = useQuery({
    queryKey: ["admin-investments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_investments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-investment-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, full_name, phone");
      const map: Record<string, { name: string; phone: string }> = {};
      (data || []).forEach((p) => {
        map[p.user_id] = { name: p.full_name || "Unnamed", phone: p.phone };
      });
      return map;
    },
  });

  const stats = useMemo(() => {
    const rows = investments || [];
    return {
      invested: rows.reduce((s, r) => s + Number(r.amount_paid), 0),
      paid: rows.filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.reward_amount), 0),
      active: rows.filter((r) => r.status === "active").length,
      completed: rows.filter((r) => r.status === "completed").length,
      cancelled: rows.filter((r) => r.status === "cancelled" || r.status === "refunded").length,
    };
  }, [investments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (investments || []).filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      const p = profiles?.[r.user_id];
      return (
        r.machine_name.toLowerCase().includes(q) ||
        (p?.name || "").toLowerCase().includes(q) ||
        (p?.phone || "").includes(q)
      );
    });
  }, [investments, statusFilter, search, profiles]);

  const act = async (body: Record<string, unknown>, okMsg: string, id?: string) => {
    setBusy(id ?? "global");
    try {
      const { data, error } = await supabase.functions.invoke("invest-admin-action", { body });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Action failed");
      toast.success(okMsg);
      queryClient.invalidateQueries({ queryKey: ["admin-investments"] });
      queryClient.invalidateQueries({ queryKey: ["investment-settings"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const adjust = (r: Row) => {
    const input = window.prompt(`New reward amount for ${r.machine_name}`, String(r.reward_amount));
    if (input === null) return;
    const amount = Number(input);
    if (!Number.isFinite(amount) || amount < 0) { toast.error("Invalid amount"); return; }
    act({ action: "adjust_reward", investmentId: r.id, rewardAmount: amount }, "Reward adjusted", r.id);
  };

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Investments</h1>
          <p className="text-muted-foreground">Monitor and manage all user investments</p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: "Total invested", value: `UGX ${stats.invested.toLocaleString()}`, icon: Wallet },
            { label: "Rewards paid", value: `UGX ${stats.paid.toLocaleString()}`, icon: TrendingUp },
            { label: "Active", value: String(stats.active), icon: Activity },
            { label: "Completed", value: String(stats.completed), icon: Activity },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-3 py-4">
                <div className="rounded-xl bg-primary/10 p-2"><s.icon className="h-4 w-4 text-primary" /></div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold">{s.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="font-semibold">Reward processing</p>
              <p className="text-sm text-muted-foreground">
                {paused ? "Paused — matured investments will not pay out." : "Running — matured investments pay out automatically."}
              </p>
            </div>
            <Switch
              checked={!paused}
              disabled={busy === "global"}
              onCheckedChange={(v) =>
                act({ action: "toggle_rewards_pause", paused: !v }, v ? "Reward processing resumed" : "Reward processing paused")
              }
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by user or machine" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((r) => {
              const p = profiles?.[r.user_id];
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p?.name || "User"} · {p?.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.machine_name} · UGX {Number(r.amount_paid).toLocaleString()} → UGX {Number(r.reward_amount).toLocaleString()}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Matures {new Date(r.matures_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant="outline" className="capitalize">{r.status}</Badge>
                      {r.status === "active" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={busy === r.id}>
                              {busy === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => act({ action: "complete", investmentId: r.id }, "Investment completed & paid", r.id)}>
                              Complete now (pay reward)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => act({ action: "cancel_refund", investmentId: r.id }, "Cancelled & refunded", r.id)}>
                              Cancel & refund
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => adjust(r)}>Adjust reward</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => act({ action: "cancel", investmentId: r.id }, "Cancelled without refund", r.id)}>
                              Cancel without refund
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">No investments found.</p>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
