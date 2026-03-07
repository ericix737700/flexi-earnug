import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Smartphone, CheckCircle } from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useAuth } from "@/contexts/AuthContext";
import { PlatformLogo } from "@/components/PlatformLogo";

export default function PayRegistration() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { data: settings } = usePlatformSettings();

  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const registrationFee = settings?.registration_fee
    ? Number(settings.registration_fee)
    : 5000;

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter your Mobile Money number");
      return;
    }

    setIsLoading(true);

    try {
      // Create a deposit record for the registration fee
      const { data: deposit, error: depositError } = await supabase
        .from("deposits")
        .insert({
          user_id: profile?.user_id,
          amount: registrationFee,
          transaction_id: "registration_fee_pending",
        })
        .select()
        .single();

      if (depositError) throw depositError;

      // Call MarzPay collect for the registration fee
      const { data, error } = await supabase.functions.invoke("marzpay-collect", {
        body: {
          amount: registrationFee,
          phone_number: phoneNumber.trim(),
          deposit_id: deposit.id,
        },
      });

      if (error) throw error;

      if (data?.error) {
        await supabase.from("deposits").delete().eq("id", deposit.id);
        throw new Error(data.error);
      }

      // Mark registration as paid and activate account
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          registration_paid: true,
          status: "active",
        })
        .eq("user_id", profile?.user_id);

      if (updateError) throw updateError;

      // Create transaction record
      await supabase.from("transactions").insert({
        user_id: profile?.user_id,
        transaction_type: "registration_fee",
        amount: -registrationFee,
        balance_after: 0,
        description: `Registration fee paid via Mobile Money`,
      });

      // Check if user was referred and pay referral bonus
      if (profile?.referred_by) {
        const referralBonus = settings?.referral_bonus
          ? Number(settings.referral_bonus)
          : 1000;

        const { data: referrer } = await supabase
          .from("profiles")
          .select("user_id, balance")
          .eq("id", profile.referred_by)
          .single();

        if (referrer) {
          const newBalance = Number(referrer.balance) + referralBonus;

          await supabase
            .from("profiles")
            .update({ balance: newBalance })
            .eq("id", profile.referred_by);

          await supabase.from("transactions").insert({
            user_id: referrer.user_id,
            transaction_type: "referral_bonus",
            amount: referralBonus,
            balance_after: newBalance,
            description: `Referral bonus for ${profile.full_name || profile.phone}`,
          });
        }
      }

      setIsPaid(true);
      await refreshProfile();
      toast.success("Payment request sent! Check your phone to approve.");

      setTimeout(() => {
        navigate("/dashboard");
      }, 3000);
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.message || "Payment failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isPaid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <Card className="w-full max-w-md border-2 shadow-xl">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-full bg-success/20 p-4">
              <CheckCircle className="h-16 w-16 text-success" />
            </div>
            <h2 className="mb-2 text-2xl font-bold">Payment Request Sent!</h2>
            <p className="text-muted-foreground">
              Check your phone and approve the Mobile Money prompt.
              Your account will be activated automatically. Redirecting...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="w-full max-w-md border-2 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <PlatformLogo size="lg" />
          </div>
          <CardTitle className="text-2xl font-bold">Activate Your Account</CardTitle>
          <CardDescription>
            Pay the one-time activation fee to start earning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Activation Fee</p>
            <p className="text-3xl font-bold text-primary">
              UGX {registrationFee.toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pay-phone">Mobile Money Number</Label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="pay-phone"
                type="tel"
                placeholder="0700123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              MTN or Airtel Money number. You'll receive a prompt to approve.
            </p>
          </div>

          <div className="rounded-lg border border-secondary bg-secondary/10 p-3">
            <p className="text-sm text-secondary-foreground">
              <strong>How it works:</strong> A payment prompt will be sent to your phone. 
              Approve it to activate your account and start earning immediately!
            </p>
          </div>

          <Button
            onClick={handlePayment}
            className="w-full font-semibold"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending payment request...
              </>
            ) : (
              `Pay UGX ${registrationFee.toLocaleString()}`
            )}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Secure payment powered by MarzPay
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
