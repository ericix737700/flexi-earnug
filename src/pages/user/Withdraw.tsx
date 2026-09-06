import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FeaturePage } from "@/components/layout/FeaturePage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { NetworkBadge } from "@/components/NetworkBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useWithdrawalFee } from "@/hooks/useWithdrawalFee";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, CheckCircle, ChevronRight, CircleAlert, Clock3, Loader2, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

const formatMoney = (value: number) => `UGX ${value.toLocaleString()}`;
type Network = "MTN" | "Airtel";

export default function Withdraw() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { data: settings } = usePlatformSettings();
  const queryClient = useQueryClient();
  const fee = useWithdrawalFee();
  const [step, setStep] = useState<"details" | "review">("details");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [network, setNetwork] = useState<Network>("MTN");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (profile?.phone && !phone) setPhone(profile.phone);
  }, [profile?.phone, phone]);

  useEffect(() => {
    setRecipientName(null);
    setLookupError(null);
  }, [phone, network]);

  const pinStatus = useQuery({
    queryKey: ["fe-pin-status"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("withdrawal-security", { body: { action: "status" } });
      if (error) throw error;
      return Boolean(data?.configured);
    },
  });

  const requestedAmount = Number(amount) || 0;
  const feeAmount = fee.calculate(requestedAmount);
  const totalDeducted = requestedAmount + feeAmount;
  const minimumWithdrawal = Number(settings?.minimum_withdrawal || 5000);

  const verifyRecipient = async () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9 || digits.length > 12) {
      setLookupError("Enter a valid Ugandan phone number");
      return;
    }
    setIsLookingUp(true);
    setLookupError(null);
    try {
      const { data, error } = await supabase.functions.invoke("marzpay-lookup-name", { body: { phone_number: phone } });
      if (error) throw error;
      if (!data?.success || !data?.name) throw new Error(data?.error || "Could not verify this mobile money account");
      setRecipientName(String(data.name).trim());
      toast.success("Account holder verified");
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : "Name verification failed");
    } finally {
      setIsLookingUp(false);
    }
  };

  const continueToReview = () => {
    if (requestedAmount < minimumWithdrawal) {
      toast.error(`Minimum withdrawal is ${formatMoney(minimumWithdrawal)}`);
      return;
    }
    if (totalDeducted > Number(profile?.balance || 0)) {
      toast.error("Insufficient balance for this withdrawal and fee");
      return;
    }
    if (!recipientName) {
      toast.error("Verify the account holder first");
      return;
    }
    if (!pinStatus.data) {
      toast.error("Set your 4-digit FE PIN in Profile Settings first");
      navigate("/profile/settings#fe-pin");
      return;
    }
    setPin("");
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (pin.length !== 4) throw new Error("Enter your 4-digit FE PIN");
      const { data, error } = await supabase.functions.invoke("withdrawal-security", {
        body: { action: "withdraw", pin, amount: requestedAmount, phone_number: phone, network, recipient_name: recipientName },
      });
      if (error) {
        const detail = await error.context?.json?.().catch?.(() => null);
        throw new Error(detail?.error || error.message);
      }
      if (data?.error) throw new Error(data.error);
      if (data?.automatic && data?.withdrawal_id) {
        const payout = await supabase.functions.invoke("marzpay-send", { body: { withdrawal_id: data.withdrawal_id } });
        if (payout.data?.error) return { ...data, payoutWarning: payout.data.error };
      }
      return data;
    },
    onSuccess: async (data) => {
      if (data?.payoutWarning) toast.warning(`Withdrawal saved. Payout is pending: ${data.payoutWarning}`);
      else toast.success(data?.automatic ? "Withdrawal authorized and payout started" : "Withdrawal authorized and sent for approval");
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      navigate("/wallet");
    },
    onError: (error: Error) => {
      setPin("");
      toast.error(error.message);
    },
  });

  if (step === "review") {
    return (
      <FeaturePage title="Withdrawal Review" backTo="/wallet" actions={
        <div className="flex items-center gap-1 rounded-full border bg-card px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" /> 256-BIT
        </div>
      }>
        <section className="overflow-hidden rounded-xl border bg-card p-5 text-center shadow-sm">
          <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase text-primary">
            <Clock3 className="h-3.5 w-3.5" /> Instant (est. 10–45 seconds)
          </div>
          <p className="mt-4 text-sm text-muted-foreground">You are sending</p>
          <p className="mt-1 text-3xl font-extrabold tracking-normal"><span className="mr-1 text-base text-primary">UGX</span>{requestedAmount.toLocaleString()}</p>
          <div className="mx-auto mt-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
            <CheckCircle className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-primary">{formatMoney(requestedAmount)}</span> will be credited
          </div>
        </section>

        <section className="space-y-3">
          <p className="px-1 text-xs font-bold uppercase text-muted-foreground">Transfer breakdown</p>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><UserRound className="h-5 w-5 text-primary" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{recipientName}</p>
                <p className="text-xs text-muted-foreground">{phone}</p>
              </div>
              <NetworkBadge override={network.toLowerCase()} size="md" />
            </div>
            <div className="space-y-3 border-b py-4 text-xs">
              <div className="flex justify-between gap-4"><span className="text-muted-foreground">Source account</span><span className="text-right font-medium">FlexiEarn Yield Wallet<br/><span className="text-primary">Bal: {formatMoney(Number(profile?.balance || 0))}</span></span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transfer fee</span><span className="font-semibold">{formatMoney(feeAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Amount to receive</span><span className="font-semibold">{formatMoney(requestedAmount)}</span></div>
            </div>
            <div className="flex items-center justify-between pt-4"><span className="font-bold">Total Deducted</span><span className="text-lg font-extrabold text-primary">{formatMoney(totalDeducted)}</span></div>
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex gap-2.5">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div><h2 className="font-bold">Security Verification Required</h2><p className="mt-1 text-xs text-muted-foreground">Enter your 4-digit FE PIN to authorize this payout.</p></div>
          </div>
          <InputOTP maxLength={4} value={pin} onChange={setPin} inputMode="numeric" containerClassName="mt-5 justify-center">
            <InputOTPGroup className="gap-3">
              {[0, 1, 2, 3].map((index) => <InputOTPSlot key={index} index={index} className="h-14 w-12 rounded-xl border bg-background text-xl font-bold first:rounded-xl first:border last:rounded-xl" />)}
            </InputOTPGroup>
          </InputOTP>
          <div className="mt-5 flex gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" /> Transfers cannot be reversed once sent to mobile network operators.
          </div>
        </section>

        <Button className="h-14 w-full rounded-xl font-bold" disabled={pin.length !== 4 || withdrawMutation.isPending} onClick={() => withdrawMutation.mutate()}>
          {withdrawMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Authorizing…</> : <><LockKeyhole className="mr-2 h-4 w-4" />Authorize & Confirm Withdrawal</>}
        </Button>
        <Button variant="ghost" className="w-full" disabled={withdrawMutation.isPending} onClick={() => { setStep("details"); setPin(""); }}>Cancel & Edit</Button>
      </FeaturePage>
    );
  }

  return (
    <FeaturePage title="Withdraw Funds" description={`Minimum ${formatMoney(minimumWithdrawal)}`} backTo="/wallet">
      <section className="rounded-xl border bg-card p-5 text-center shadow-sm">
        <p className="text-xs font-medium uppercase text-muted-foreground">Available balance</p>
        <p className="mt-2 text-3xl font-extrabold tracking-normal">{formatMoney(Number(profile?.balance || 0))}</p>
      </section>

      <section className="space-y-5 rounded-xl border bg-card p-5 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">Amount to send</Label>
          <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">UGX</span><Input id="withdraw-amount" type="number" inputMode="numeric" min={minimumWithdrawal} value={amount} onChange={(event) => setAmount(event.target.value)} className="h-13 pl-14 text-lg font-bold" placeholder="0" /></div>
        </div>

        <div className="space-y-2">
          <Label>Supported network</Label>
          <div className="grid grid-cols-2 gap-3">
            {(["MTN", "Airtel"] as Network[]).map((item) => (
              <Button key={item} type="button" variant="outline" onClick={() => setNetwork(item)} className={`h-14 justify-between rounded-xl ${network === item ? "border-primary bg-primary/10 ring-1 ring-primary" : ""}`}>
                <NetworkBadge override={item.toLowerCase()} size="md" />
                {network === item && <Check className="h-4 w-4 text-primary" />}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="withdraw-phone">Mobile money number</Label>
          <div className="flex gap-2">
            <Input id="withdraw-phone" type="tel" inputMode="tel" maxLength={16} value={phone} onChange={(event) => setPhone(event.target.value)} disabled={isLookingUp} className="h-12 flex-1" placeholder="0700 123 456" />
            <Button type="button" variant="outline" className="h-12" onClick={verifyRecipient} disabled={isLookingUp || Boolean(recipientName)}>
              {isLookingUp ? <Loader2 className="h-4 w-4 animate-spin" /> : recipientName ? <CheckCircle className="h-4 w-4 text-primary" /> : "Verify"}
            </Button>
          </div>
          {isLookingUp && <div className="flex items-center gap-3 rounded-lg bg-muted/60 p-3"><Skeleton className="h-8 w-8 rounded-full"/><div className="space-y-1.5"><Skeleton className="h-3 w-24"/><Skeleton className="h-3 w-40"/></div></div>}
          {recipientName && <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm"><CheckCircle className="h-4 w-4 text-primary"/><span><span className="text-xs text-muted-foreground">Account holder</span><br/><strong>{recipientName}</strong></span></div>}
          {lookupError && <p className="flex items-center gap-1.5 text-xs text-destructive"><CircleAlert className="h-3.5 w-3.5"/>{lookupError}</p>}
        </div>

        {requestedAmount > 0 && <div className="space-y-2 border-t pt-4 text-sm"><div className="flex justify-between text-muted-foreground"><span>Processing fee</span><span>{formatMoney(feeAmount)}</span></div><div className="flex justify-between font-bold"><span>Total deducted</span><span className="text-primary">{formatMoney(totalDeducted)}</span></div>{fee.enabled && <p className="text-[11px] text-muted-foreground">{fee.note}</p>}</div>}
      </section>

      {pinStatus.isLoading ? <Skeleton className="h-12 w-full rounded-xl" /> : !pinStatus.data ? <Button variant="outline" className="h-12 w-full justify-between rounded-xl" onClick={() => navigate("/profile/settings#fe-pin")}><span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-warning"/>Set up your FE PIN first</span><ChevronRight className="h-4 w-4"/></Button> : null}
      <Button className="h-14 w-full rounded-xl font-bold" onClick={continueToReview} disabled={!recipientName || requestedAmount <= 0}>Review Withdrawal <ChevronRight className="ml-2 h-4 w-4"/></Button>
    </FeaturePage>
  );
}
