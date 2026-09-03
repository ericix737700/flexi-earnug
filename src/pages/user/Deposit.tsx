import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { toast } from "sonner";
import { Loader2, Smartphone, ShieldCheck } from "lucide-react";
import { SuccessAnimation } from "@/components/user/SuccessAnimation";

export default function Deposit() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { data: settings } = usePlatformSettings();
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile?.phone && !phoneNumber) setPhoneNumber(profile.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.phone]);

  // Listen for deposit status changes in realtime
  useEffect(() => {
    if (!user?.id || !success) return;

    const channel = supabase
      .channel("deposit-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` },
        (payload) => {
          if ((payload.new as { status?: string }).status === "approved") refreshProfile();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => refreshProfile()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, success]);

  const handleSubmit = async () => {
    if (settings?.emergency_mode === "true" || settings?.kill_deposits === "true") {
      toast.error("Deposits are temporarily disabled. Please try again later.");
      return;
    }
    if ((profile as any)?.restrictions?.no_transactions) {
      toast.error("Your account is restricted from making transactions");
      return;
    }
    if (!amount.trim() || !phoneNumber.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 500) {
      toast.error("Minimum deposit is UGX 500");
      return;
    }
    if (amountNum > 10000000) {
      toast.error("Maximum deposit is UGX 10,000,000");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: deposit, error: depositError } = await supabase
        .from("deposits")
        .insert({
          user_id: user?.id,
          amount: amountNum,
          transaction_id: "pending_marzpay",
        })
        .select()
        .single();

      if (depositError) throw depositError;

      const { data, error } = await supabase.functions.invoke("marzpay-collect", {
        body: {
          amount: amountNum,
          phone_number: phoneNumber.trim(),
          deposit_id: deposit.id,
        },
      });

      if (error) throw error;

      if (data?.error) {
        await supabase.from("deposits").delete().eq("id", deposit.id);
        throw new Error(data.error);
      }

      setSuccess(true);
      toast.success("Payment request sent! Check your phone to approve the payment.");
    } catch (error: any) {
      console.error("Error initiating deposit:", error);
      toast.error(error.message || "Failed to initiate deposit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeaturePage
      title="Deposit Funds"
      description={
        success
          ? "A payment prompt has been sent to your phone"
          : "Enter the amount and your mobile money number to deposit"
      }
      backTo="/wallet"
    >
      {success ? (
        <Card className="glass-card border-0">
          <CardContent className="space-y-4 py-8 text-center">
            <SuccessAnimation
              message="Payment Request Sent!"
              subMessage="Check your phone and approve the Mobile Money prompt. Your account will be credited automatically."
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="w-full" onClick={() => { setSuccess(false); setAmount(""); }}>
                Make another deposit
              </Button>
              <Button className="w-full" onClick={() => navigate("/wallet")}>
                Back to Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="glass-card border-0">
            <CardContent className="space-y-4 py-5">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount (UGX)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 10000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  min={500}
                  max={10000000}
                  className="h-12 text-lg font-semibold"
                />
                <div className="grid grid-cols-4 gap-2">
                  {[5000, 10000, 50000, 100000].map((v) => (
                    <Button
                      key={v}
                      type="button"
                      variant={amount === String(v) ? "default" : "outline"}
                      size="sm"
                      className="rounded-xl"
                      onClick={() => setAmount(String(v))}
                    >
                      {v / 1000}K
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Min: UGX 500 · Max: UGX 10,000,000</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deposit-phone">Mobile Money Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="deposit-phone"
                    type="tel"
                    placeholder="0700123456"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="h-12 pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  MTN or Airtel Money number. You'll receive a prompt to approve.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="rounded-2xl border border-secondary/40 bg-secondary/10 p-4">
            <p className="text-sm text-secondary-foreground">
              <strong>How it works:</strong> A payment prompt will be sent to your phone. Approve it to
              complete the deposit. Your account will be credited automatically.
            </p>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" /> Secured with 256-bit encryption. Transaction fees may apply.
            </p>
          </div>

          <Button className="h-12 w-full rounded-xl font-semibold" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending payment request...
              </>
            ) : (
              "Deposit Now"
            )}
          </Button>
        </div>
      )}
    </FeaturePage>
  );
}
