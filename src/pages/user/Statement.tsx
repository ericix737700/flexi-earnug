import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, FileText, Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { EmptyState } from "@/components/EmptyState";
import { transactionLabel } from "@/lib/transactions";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

type RangeKey = "all" | "today" | "week" | "month";

function rangeStart(key: RangeKey): Date | null {
  const now = new Date();
  if (key === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (key === "week") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (key === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

export default function Statement() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [range, setRange] = useState<RangeKey>("all");
  const [type, setType] = useState<string>("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["statement", profile?.user_id, range, limit],
    queryFn: async () => {
      if (!profile?.user_id) return [] as Transaction[];
      let q = supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      const start = rangeStart(range);
      if (start) q = q.gte("created_at", start.toISOString());

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!profile?.user_id,
  });

  const types = useMemo(() => {
    const set = new Set((transactions || []).map((t) => t.transaction_type));
    return Array.from(set);
  }, [transactions]);

  const rows = useMemo(
    () => (transactions || []).filter((t) => type === "all" || t.transaction_type === type),
    [transactions, type]
  );

  const totalIn = rows.filter((t) => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = rows.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const groups = rows.reduce<Record<string, Transaction[]>>((acc, t) => {
    const d = new Date(t.created_at);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    let label = d.toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    (acc[label] ||= []).push(t);
    return acc;
  }, {});

  return (
    <UserLayout>
      <SEO
        title="Account Statement | FlexiEarn"
        description="View your full FlexiEarn account statement with dates, amounts, balances before and after, and what each transaction was for."
      />
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold">
              <FileText className="h-4.5 w-4.5 text-primary" />
              Account Statement
            </h1>
            <p className="text-xs text-muted-foreground">Every movement on your wallet, in full detail.</p>
          </div>
        </div>

        {/* Summary */}
        <Card className="glass-card border-0">
          <CardContent className="grid grid-cols-3 gap-2 py-4 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Money In</p>
              <p className="text-sm font-bold text-success">+UGX {totalIn.toLocaleString()}</p>
            </div>
            <div className="border-x border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Money Out</p>
              <p className="text-sm font-bold text-destructive">−UGX {totalOut.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Balance</p>
              <p className="text-sm font-bold text-primary">
                UGX {Number(profile?.balance || 0).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="grid grid-cols-2 gap-2">
          <Select value={range} onValueChange={(v) => { setRange(v as RangeKey); setLimit(PAGE_SIZE); }}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Period" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">This month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>{transactionLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Rows */}
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No transactions"
            description="Transactions for the selected period will appear here."
          />
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([label, items]) => (
              <div key={label}>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <div className="overflow-hidden rounded-2xl border bg-card divide-y">
                  {items.map((t) => {
                    const amount = Number(t.amount);
                    const isIn = amount > 0;
                    const after = Number(t.balance_after);
                    const before = after - amount;
                    return (
                      <div key={t.id} className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`mt-0.5 rounded-full p-2 ${isIn ? "bg-success/15" : "bg-destructive/15"}`}>
                              {isIn ? (
                                <ArrowDownLeft className="h-4 w-4 text-success" />
                              ) : (
                                <ArrowUpRight className="h-4 w-4 text-destructive" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {t.description || transactionLabel(t.transaction_type, amount)}
                              </p>
                              <div className="mt-1 flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                                  {transactionLabel(t.transaction_type, amount)}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">
                                  {new Date(t.created_at).toLocaleString("en-UG", {
                                    day: "numeric", month: "short", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className={`shrink-0 text-sm font-bold ${isIn ? "text-success" : "text-destructive"}`}>
                            {isIn ? "+" : "−"}UGX {Math.abs(amount).toLocaleString()}
                          </p>
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-muted/40 px-3 py-2">
                          <div>
                            <p className="text-[10px] text-muted-foreground">Balance before</p>
                            <p className="text-xs font-semibold">UGX {before.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] text-muted-foreground">Balance after</p>
                            <p className="text-xs font-semibold">UGX {after.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {(transactions || []).length >= limit && (
              <Button variant="outline" className="w-full rounded-xl" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
                Load more
              </Button>
            )}
          </div>
        )}
      </div>
    </UserLayout>
  );
}
