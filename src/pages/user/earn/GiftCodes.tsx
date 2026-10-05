import { useQuery } from "@tanstack/react-query";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { GiftCodeRedeem } from "@/components/user/GiftCodeRedeem";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Gift } from "lucide-react";

export default function EarnGiftCodes() {
  const { user } = useAuth();
  const history = useQuery({
    queryKey: ["my-gift-redemptions", user?.id],
    enabled: !!user?.id,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase.from("gift_code_redemptions").select("id, amount, redeemed_at, gift_codes(code)").eq("user_id", user!.id).order("redeemed_at", { ascending: false }).limit(30);
      return (data || []) as any[];
    },
  });

  return (
    <FeaturePage title="Gift Codes" description="Enter a code shared in our community channels to get an instant reward." backTo="/dashboard">
      <div className="space-y-6">
        <GiftCodeRedeem />
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Your redeemed codes</h2>
          {history.isLoading && <Skeleton className="h-16 w-full rounded-xl" />}
          {!history.isLoading && !history.data?.length && <p className="text-sm text-muted-foreground">No codes redeemed yet.</p>}
          {history.data?.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-card p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/15 text-secondary"><Gift className="h-4 w-4" /></div>
              <div className="flex-1">
                <p className="font-mono text-sm font-semibold">{r.gift_codes?.code ?? "Gift code"}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.redeemed_at).toLocaleString("en-UG")}</p>
              </div>
              <span className="font-bold text-primary">+UGX {Number(r.amount).toLocaleString()}</span>
            </div>
          ))}
        </section>
      </div>
    </FeaturePage>
  );
}
