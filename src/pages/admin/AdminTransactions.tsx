import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, Receipt, Download, ChevronDown } from "lucide-react";
import { transactionLabel, formatUGX, formatTxDate } from "@/lib/transactions";

interface Tx {
  id: string;
  user_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

interface ProfileLite {
  user_id: string;
  full_name: string | null;
  phone: string;
  email: string | null;
  account_id: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", query, type, from, to],
    queryFn: async () => {
      let matchedUserIds: string[] = [];
      let profiles: ProfileLite[] = [];

      if (query) {
        const term = `%${query}%`;
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email, account_id")
          .or(
            `phone.ilike.${term},full_name.ilike.${term},email.ilike.${term},account_id.ilike.${term}`
          )
          .limit(200);
        profiles = (p || []) as ProfileLite[];
        matchedUserIds = profiles.map((x) => x.user_id);
      }

      let q = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (type !== "all") q = q.eq("transaction_type", type);
      if (from) q = q.gte("created_at", new Date(from).toISOString());
      if (to) q = q.lte("created_at", new Date(`${to}T23:59:59`).toISOString());

      if (query) {
        const filters: string[] = [`reference_id.ilike.%${query}%`, `description.ilike.%${query}%`];
        if (UUID_RE.test(query)) filters.push(`id.eq.${query}`);
        if (matchedUserIds.length) filters.push(`user_id.in.(${matchedUserIds.join(",")})`);
        q = q.or(filters.join(","));
      }

      const { data: txs, error } = await q;
      if (error) throw error;

      const ids = [...new Set((txs || []).map((t) => t.user_id))];
      const known = new Set(profiles.map((p) => p.user_id));
      const missing = ids.filter((i) => !known.has(i));
      if (missing.length) {
        const { data: more } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email, account_id")
          .in("user_id", missing);
        profiles = [...profiles, ...((more || []) as ProfileLite[])];
      }

      const map = new Map(profiles.map((p) => [p.user_id, p]));
      return { txs: (txs || []) as Tx[], map };
    },
  });

  const exportCsv = () => {
    if (!data?.txs.length) return;
    const rows = [
      ["Transaction ID", "Date", "Account ID", "Name", "Phone", "Type", "Amount", "Balance After", "Reference", "Description"],
      ...data.txs.map((t) => {
        const p = data.map.get(t.user_id);
        return [
          t.id,
          new Date(t.created_at).toISOString(),
          p?.account_id || "",
          p?.full_name || "",
          p?.phone || "",
          t.transaction_type,
          String(t.amount),
          String(t.balance_after),
          t.reference_id || "",
          (t.description || "").replace(/,/g, " "),
        ];
      }),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Search every transaction by ID, reference, phone number, account ID or name
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-5 w-5 text-primary" /> Search & filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setQuery(search.trim());
              }}
            >
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Transaction ID, reference, phone, account ID, name…"
              />
              <Button type="submit">Search</Button>
            </form>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["all", "earning", "withdrawal", "deposit", "purchase", "refund", "referral", "gift_code", "achievement", "investment", "investment_reward", "admin_credit", "admin_debit"].map((t) => (
                      <SelectItem key={t} value={t}>{t === "all" ? "All types" : transactionLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">From</Label>
                <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">To</Label>
                <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" className="w-full" onClick={exportCsv} disabled={!data?.txs.length}>
                  <Download className="mr-2 h-4 w-4" /> Export CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-5 w-5 text-primary" />
              Results {data?.txs.length ? `(${data.txs.length})` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : !data?.txs.length ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No transactions found.</p>
            ) : (
              <div className="space-y-2">
                {data.txs.map((t) => {
                  const p = data.map.get(t.user_id);
                  return (
                    <Collapsible key={t.id} className="rounded-xl border">
                      <CollapsibleTrigger className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/50">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {transactionLabel(t.transaction_type, t.amount)}
                            <span className="ml-2 text-xs text-muted-foreground">
                              {p?.full_name || p?.phone || "Unknown user"}
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p?.account_id} · {formatTxDate(t.created_at)}
                          </p>
                        </div>
                        <Badge variant={t.amount >= 0 ? "default" : "destructive"} className="shrink-0">
                          {t.amount >= 0 ? "+" : "-"}{formatUGX(t.amount)}
                        </Badge>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-1.5 border-t bg-muted/30 p-3 text-xs">
                        <Detail label="Transaction ID" value={t.id} mono />
                        <Detail label="Reference" value={t.reference_id || "—"} mono />
                        <Detail label="Account ID" value={p?.account_id || "—"} mono />
                        <Detail label="Phone" value={p?.phone || "—"} />
                        <Detail label="Email" value={p?.email || "—"} />
                        <Detail label="Balance after" value={formatUGX(t.balance_after)} />
                        <Detail label="Description" value={t.description || "—"} />
                        <Detail label="Date" value={new Date(t.created_at).toLocaleString("en-UG")} />
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={`max-w-[65%] break-all text-right ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
