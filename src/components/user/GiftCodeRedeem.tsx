import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Gift, Loader2, Sparkles } from "lucide-react";

export function GiftCodeRedeem() {
  const { refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

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
      toast.success(`🎉 You earned UGX ${Number(result.amount).toLocaleString()}!`);
      setCode("");
      refreshProfile();
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
      <CardContent className="relative">
        <div className="flex gap-2">
          <Input
            placeholder="Enter gift code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="uppercase font-mono"
            disabled={loading}
          />
          <Button onClick={redeem} disabled={loading || !code.trim()} className="gradient-gold border-0 text-secondary-foreground tap-pop">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4" />Redeem</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
