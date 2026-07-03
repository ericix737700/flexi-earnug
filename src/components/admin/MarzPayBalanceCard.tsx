import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, AlertCircle, Loader2 } from "lucide-react";

export function MarzPayBalanceCard() {
  const q = useQuery({
    queryKey: ["marzpay-balance"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("marzpay-balance");
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Unknown error");
      return data as { balance: number; currency: string };
    },
    retry: false,
    staleTime: 60_000,
  });

  return (
    <Card className="border-border/50 bg-gradient-to-br from-primary/10 to-secondary/10">
      <CardContent className="flex items-center justify-between gap-3 py-5 px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/20 p-3">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">MarzPay Wallet Balance</p>
            {q.isLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </p>
            ) : q.isError ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> {(q.error as Error).message}
              </p>
            ) : (
              <p className="text-xl font-bold truncate">
                {q.data?.currency || "UGX"} {Number(q.data?.balance || 0).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={() => q.refetch()} disabled={q.isFetching} aria-label="Refresh MarzPay balance">
          <RefreshCw className={`h-4 w-4 ${q.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardContent>
    </Card>
  );
}
