import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Smartphone, CheckCircle, Shield, Zap } from "lucide-react";
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

  // Realtime listener — redirect when account gets activated (by admin or webhook)
  useEffect(() => {
    if (!profile?.user_id) return;

    // If already paid, redirect immediately
    if (profile.registration_paid) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const channel = supabase
      .channel("registration-status")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${profile.user_id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (updated.registration_paid) {
            toast.success("Your account has been activated!");
            refreshProfile();
            navigate("/dashboard", { replace: true });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id, profile?.registration_paid, navigate, refreshProfile]);

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error("Please enter your Mobile Money number");
      return;
    }

    setIsLoading(true);

    try {
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

      setIsPaid(true);
      toast.success("Payment request sent! Check your phone to approve.");
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
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 animate-ping rounded-full bg-green-400/30" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20">
                <CheckCircle className="h-10 w-10 text-green-500" strokeWidth={2.5} />
              </div>
            </div>
            <h2 className="mb-2 text-2xl font-bold">Payment Request Sent!</h2>
            <p className="text-muted-foreground">
              Check your phone and approve the Mobile Money prompt.
              Your account will be activated automatically.
            </p>
            <div className="mt-6 flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">Waiting for confirmation...</span>
            </div>
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

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-xs">Secure Payment</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border p-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-xs">Instant Activation</span>
            </div>
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
