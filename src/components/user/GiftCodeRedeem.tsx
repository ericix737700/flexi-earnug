import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Gift, Loader2, Sparkles, CheckCircle2, PartyPopper } from "lucide-react";

export function GiftCodeRedeem() {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ amount: number; code: string } | null>(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("redeem_gift_code" as any, { _code: code.trim() });
      if (error) throw error;
      const result = data as { success: boolean; error?: string; amount?: number };
      if (!result.success) {
        toast.error(result.error || "Could not redeem code");
        return;
      }
      const amt = Number(result.amount);
      setSuccess({ amount: amt, code: code.trim().toUpperCase() });
      toast.success(`🎉 You earned UGX ${amt.toLocaleString()}!`);
      setCode("");
      refreshProfile();
      // Auto-dismiss banner after 6 seconds
      setTimeout(() => setSuccess(null), 6000);
    } catch (e: any) {
      toast.error(e.message || "Failed to redeem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden glass-card border-0">
      <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-secondary/30 blur-3xl" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gift className="h-5 w-5 text-secondary" /> Redeem a Gift Code
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-3">
        {success && (
          <div
            role="status"
            className="relative overflow-hidden rounded-xl border border-success/40 bg-gradient-to-br from-success/15 via-secondary/10 to-primary/15 p-4 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-500"
          >
            {/* Confetti dots */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {Array.from({ length: 14 }).map((_, i) => (
                <span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full animate-bounce"
                  style={{
                    backgroundColor: ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--success))", "#f59e0b"][i % 4],
                    left: `${5 + Math.random() * 90}%`,
                    top: `${5 + Math.random() * 80}%`,
                    animationDelay: `${i * 80}ms`,
                    animationDuration: `${700 + Math.random() * 600}ms`,
                  }}
                />
              ))}
            </div>
            <div className="relative flex items-center gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success/20">
                <span className="absolute inset-0 animate-ping rounded-full bg-success/30" />
                <CheckCircle2 className="relative h-7 w-7 text-success" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <PartyPopper className="h-4 w-4 text-secondary" />
                  <p className="text-sm font-semibold">Gift code redeemed!</p>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Code <span className="font-mono font-bold text-foreground">{success.code}</span> credited to your wallet
                </p>
                <p className="mt-1 text-2xl font-extrabold text-gradient-primary">
                  +UGX {success.amount.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSuccess(null)}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Enter gift code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="uppercase font-mono"
            disabled={loading}
            onKeyDown={(e) => e.key === "Enter" && redeem()}
          />
          <Button onClick={redeem} disabled={loading || !code.trim()} className="gradient-gold border-0 text-secondary-foreground tap-pop">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" />Redeem</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
