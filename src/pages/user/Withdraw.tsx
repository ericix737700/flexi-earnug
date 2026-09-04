import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useWithdrawalFee } from "@/hooks/useWithdrawalFee";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle, Info, Loader2, Smartphone, XCircle } from "lucide-react";

export default function Withdraw() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { data: settings } = usePlatformSettings();
  const queryClient = useQueryClient();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState(profile?.phone || "");
  const [withdrawNetwork, setWithdrawNetwork] = useState<"MTN" | "Airtel">("MTN");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  useEffect(() => {
    if (profile?.phone && !withdrawPhone) setWithdrawPhone(profile.phone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.phone]);

  // Reset name verification when phone changes
  useEffect(() => {
    setRecipientName(null);
    setLookupError(null);
  }, [withdrawPhone]);

  const verifyRecipientName = async () => {
    if (!withdrawPhone || withdrawPhone.replace(/\D/g, "").length < 9) {
      setLookupError("Enter a valid phone number first");
      return;
    }
    setIsLookingUp(true);
    setLookupError(null);
    setRecipientName(null);
    try {
      const { data, error } = await supabase.functions.invoke("marzpay-lookup-name", {
        body: { phone_number: withdrawPhone },
      });
      if (error) throw error;
      if (data?.success && data?.name) {
        setRecipientName(data.name);
        toast.success(`Account verified: ${data.name}`);
      } else {
        setLookupError(data?.error || "Could not retrieve account name");
      }
    } catch (e: any) {
      setLookupError(e.message || "Lookup failed");
    } finally {
      setIsLookingUp(false);
    }
  };

  const fee = useWithdrawalFee();
  const requestedAmount = Number(withdrawAmount) || 0;
  const feeAmount = fee.calculate(requestedAmount);
  const totalDeducted = requestedAmount + feeAmount;

  const minimumWithdrawal = settings?.minimum_withdrawal ? Number(settings.minimum_withdrawal) : 5000;

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.user_id) throw new Error("Not authenticated");
      if (settings?.emergency_mode === "true" || settings?.kill_withdrawals === "true") {
        throw new Error("Withdrawals are temporarily disabled. Please try again later.");
      }
      if ((profile as any)?.restrictions?.no_transactions)
        throw new Error("Your account is restricted from making transactions");
      if (!recipientName) throw new Error("Please verify the recipient name first");

      const amount = Number(withdrawAmount);
      if (isNaN(amount) || amount < minimumWithdrawal) {
        throw new Error(`Minimum withdrawal is UGX ${minimumWithdrawal.toLocaleString()}`);
      }

      const feeCharged = fee.calculate(amount);
      const totalDebit = amount + feeCharged;

      if (totalDebit > Number(profile.balance)) {
        throw new Error("Insufficient balance to cover the amount and processing fee");
      }

      const { data: withdrawalRow, error } = await supabase
        .from("withdrawals")
        .insert({
          user_id: profile.user_id,
          amount,
          phone_number: withdrawPhone,
          network: withdrawNetwork,
        })
        .select("id")
        .single();

      if (error) throw error;

      const newBalance = Number(profile.balance) - totalDebit;
      await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", profile.user_id);

      await supabase.from("transactions").insert({
        user_id: profile.user_id,
        transaction_type: "withdrawal",
        amount: -totalDebit,
        balance_after: newBalance,
        description:
          `Withdrawal to ${recipientName} (${withdrawNetwork} ${withdrawPhone})` +
          (feeCharged > 0 ? ` — incl. UGX ${feeCharged.toLocaleString()} processing fee` : ""),
      });

      const isAutomatic = settings?.withdrawal_mode === "automatic";
      let auto = false;
      if (isAutomatic && withdrawalRow?.id) {
        const { data: sendData, error: sendError } = await supabase.functions.invoke("marzpay-send", {
          body: { withdrawal_id: withdrawalRow.id, amount, phone_number: withdrawPhone },
        });
        if (!sendError && !sendData?.error) auto = true;
      }

      return { amount, auto };
    },
    onSuccess: ({ amount, auto }) => {
      toast.success(
        auto
          ? `Withdrawal of UGX ${amount.toLocaleString()} sent! Check your phone.`
          : `Withdrawal of UGX ${amount.toLocaleString()} submitted for approval.`
      );
      setWithdrawAmount("");
      setRecipientName(null);
      setLookupError(null);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      navigate("/wallet");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <FeaturePage
      title="Withdraw Funds"
      description={`Minimum withdrawal: UGX ${minimumWithdrawal.toLocaleString()}`}
      backTo="/wallet"
    >
      <Card className="glass-card border-0">
        <CardContent className="py-4 text-center">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="mt-1 text-2xl font-extrabold text-gradient-primary">
            UGX {Number(profile?.balance || 0).toLocaleString()}
          </p>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardContent className="space-y-4 py-5">
          <div className="space-y-2">
            <Label htmlFor="withdraw-amount">Amount (UGX)</Label>
            <Input
              id="withdraw-amount"
              type="number"
              inputMode="numeric"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="h-12 text-lg font-semibold"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Phone Number
              {recipientName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success">
                  <CheckCircle className="h-3 w-3" />
                  Verified
                </span>
              )}
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type="tel"
                  placeholder="0700123456"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  disabled={isLookingUp}
                  className={recipientName ? "h-12 border-success pr-9 focus-visible:ring-success" : "h-12 pr-9"}
                />
                {isLookingUp && (
                  <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
                {!isLookingUp && recipientName && (
                  <CheckCircle className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                )}
              </div>
              <Button
                type="button"
                variant={recipientName ? "secondary" : "outline"}
                onClick={verifyRecipientName}
                disabled={isLookingUp || !withdrawPhone || !!recipientName}
                className="h-12 min-w-[92px]"
              >
                {isLookingUp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking
                  </>
                ) : recipientName ? (
                  "Verified"
                ) : (
                  "Verify"
                )}
              </Button>
            </div>

            {isLookingUp && (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/40 p-3">
                <Skeleton className="h-4 w-4 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            )}

            {!isLookingUp && recipientName && (
              <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm animate-in fade-in slide-in-from-top-1">
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Account holder</p>
                  <p className="font-semibold">{recipientName}</p>
                </div>
              </div>
            )}

            {!isLookingUp && lookupError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm animate-in fade-in slide-in-from-top-1">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <p className="text-destructive">{lookupError}</p>
              </div>
            )}

            {!isLookingUp && !recipientName && !lookupError && (
              <p className="text-xs text-muted-foreground">
                Verify the recipient's registered name before sending.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Network</Label>
            <RadioGroup
              value={withdrawNetwork}
              onValueChange={(v) => setWithdrawNetwork(v as "MTN" | "Airtel")}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem value="MTN" id="w-mtn" className="peer sr-only" />
                <Label
                  htmlFor="w-mtn"
                  className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-muted p-3 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  MTN MoMo
                </Label>
              </div>
              <div>
                <RadioGroupItem value="Airtel" id="w-airtel" className="peer sr-only" />
                <Label
                  htmlFor="w-airtel"
                  className="flex cursor-pointer items-center justify-center rounded-xl border-2 border-muted p-3 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                >
                  <Smartphone className="mr-2 h-4 w-4" />
                  Airtel Money
                </Label>
              </div>
            </RadioGroup>
          </div>

          {requestedAmount > 0 && (
            <div className="space-y-2 rounded-xl border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">You receive</span>
                <span className="font-semibold">UGX {requestedAmount.toLocaleString()}</span>
              </div>
              {fee.enabled && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Processing fee ({fee.percent}%)</span>
                  <span className="font-semibold">UGX {feeAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="font-medium">Deducted from wallet</span>
                <span className="font-bold text-primary">UGX {totalDeducted.toLocaleString()}</span>
              </div>
              {fee.enabled && feeAmount > 0 && (
                <p className="flex items-start gap-1.5 pt-1 text-[11px] text-muted-foreground">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {fee.note}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        className="h-12 w-full rounded-xl font-semibold"
        onClick={() => withdrawMutation.mutate()}
        disabled={withdrawMutation.isPending || !recipientName}
      >
        {withdrawMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          "Submit Withdrawal"
        )}
      </Button>
    </FeaturePage>
  );
}
