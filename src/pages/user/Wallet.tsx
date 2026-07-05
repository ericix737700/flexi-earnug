import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { GiftCodeRedeem } from "@/components/user/GiftCodeRedeem";

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  phone_number: string;
  network: string;
  status: string;
  created_at: string;
}

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  const { data: settings } = usePlatformSettings();
  const queryClient = useQueryClient();

  // Realtime subscription for live updates
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('wallet-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${profile.user_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${profile.user_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${profile.user_id}` }, () => {
        refreshProfile();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState(profile?.phone || "");
  const [withdrawNetwork, setWithdrawNetwork] = useState<"MTN" | "Airtel">("MTN");
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

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

  const minimumWithdrawal = settings?.minimum_withdrawal
    ? Number(settings.minimum_withdrawal)
    : 5000;

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["transactions", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.user_id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Transaction[];
    },
    enabled: !!profile?.user_id,
  });

  // Fetch pending withdrawals
  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["pending-withdrawals", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data, error } = await supabase
        .from("withdrawals")
        .select("*")
        .eq("user_id", profile.user_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Withdrawal[];
    },
    enabled: !!profile?.user_id,
  });

  // Withdrawal mutation
  const withdrawMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.user_id) throw new Error("Not authenticated");
      if (settings?.emergency_mode === "true" || settings?.kill_withdrawals === "true") {
        throw new Error("Withdrawals are temporarily disabled. Please try again later.");
      }
      if ((profile as any)?.restrictions?.no_transactions) throw new Error("Your account is restricted from making transactions");
      if (!recipientName) throw new Error("Please verify the recipient name first");

      const amount = Number(withdrawAmount);
      if (isNaN(amount) || amount < minimumWithdrawal) {
        throw new Error(`Minimum withdrawal is UGX ${minimumWithdrawal.toLocaleString()}`);
      }

      if (amount > Number(profile.balance)) {
        throw new Error("Insufficient balance");
      }

      // Create withdrawal request
      const { data: withdrawalRow, error } = await supabase.from("withdrawals").insert({
        user_id: profile.user_id,
        amount,
        phone_number: withdrawPhone,
        network: withdrawNetwork,
      }).select("id").single();

      if (error) throw error;

      // Deduct from balance
      const newBalance = Number(profile.balance) - amount;
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", profile.user_id);

      // Create transaction
      await supabase.from("transactions").insert({
        user_id: profile.user_id,
        transaction_type: "withdrawal",
        amount: -amount,
        balance_after: newBalance,
        description: `Withdrawal to ${recipientName} (${withdrawNetwork} ${withdrawPhone})`,
      });

      // Automatic mode: trigger MarzPay send immediately
      const isAutomatic = settings?.withdrawal_mode === "automatic";
      let auto = false;
      if (isAutomatic && withdrawalRow?.id) {
        const { data: sendData, error: sendError } = await supabase.functions.invoke("marzpay-send", {
          body: { withdrawal_id: withdrawalRow.id, amount, phone_number: withdrawPhone },
        });
        if (!sendError && !sendData?.error) {
          auto = true;
        }
      }

      return { amount, auto };
    },
    onSuccess: ({ amount, auto }) => {
      toast.success(
        auto
          ? `Withdrawal of UGX ${amount.toLocaleString()} sent! Check your phone.`
          : `Withdrawal of UGX ${amount.toLocaleString()} submitted for approval.`
      );
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
      setRecipientName(null);
      setLookupError(null);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const getTransactionIcon = (type: string, amount: number) => {
    if (amount > 0) {
      return <ArrowDownLeft className="h-4 w-4 text-success" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-destructive" />;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Balance Card */}
        <Card className="relative overflow-hidden border-0 glass-card glow-primary">
          <div aria-hidden className="absolute -top-12 -right-12 h-44 w-44 rounded-full bg-primary/25 blur-3xl" />
          <div aria-hidden className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl" />
          <CardContent className="relative py-7 text-center">
            <p className="text-sm text-muted-foreground">Available Balance</p>
            <p className="mt-1 text-4xl font-extrabold text-gradient-primary tracking-tight">
              UGX {Number(profile?.balance || 0).toLocaleString()}
            </p>
            <Dialog open={isWithdrawOpen} onOpenChange={setIsWithdrawOpen}>
              <DialogTrigger asChild>
                <Button className="mt-5 gradient-primary border-0 text-primary-foreground shadow-md hover:opacity-95 tap-pop" size="lg">
                  <WalletIcon className="mr-2 h-5 w-5" />
                  Withdraw
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-0">

                <DialogHeader>
                  <DialogTitle>Withdraw Funds</DialogTitle>
                  <DialogDescription>
                    Minimum withdrawal: UGX {minimumWithdrawal.toLocaleString()}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Amount (UGX)</Label>
                    <Input
                      type="number"
                      placeholder="Enter amount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
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
                          className={
                            recipientName
                              ? "border-success pr-9 focus-visible:ring-success"
                              : "pr-9"
                          }
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
                        className="min-w-[88px]"
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
                      className="grid grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="MTN" id="w-mtn" className="peer sr-only" />
                        <Label
                          htmlFor="w-mtn"
                          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-muted p-3 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          MTN MoMo
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="Airtel" id="w-airtel" className="peer sr-only" />
                        <Label
                          htmlFor="w-airtel"
                          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-muted p-3 hover:bg-accent peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10"
                        >
                          <Smartphone className="mr-2 h-4 w-4" />
                          Airtel Money
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <Button
                    className="w-full"
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
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <GiftCodeRedeem />

        {/* Pending Withdrawals */}
        {pendingWithdrawals && pendingWithdrawals.length > 0 && (
          <Card className="glass-card border-0">

            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Withdrawals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <div>
                    <p className="font-semibold">
                      UGX {withdrawal.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {withdrawal.network} - {withdrawal.phone_number}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <TransactionHistory
          transactions={transactions || []}
          isLoading={transactionsLoading}
          formatDate={formatDate}
        />
      </div>
    </UserLayout>
  );
}

function TransactionHistory({
  transactions,
  isLoading,
  formatDate,
}: {
  transactions: Transaction[];
  isLoading: boolean;
  formatDate: (d: string) => string;
}) {
  const [filter, setFilter] = useState<"all" | "in" | "out">("all");

  const filtered = transactions.filter((t) => {
    if (filter === "in") return t.amount > 0;
    if (filter === "out") return t.amount < 0;
    return true;
  });

  // Group by date label
  const groups = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const d = new Date(t.created_at);
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    let label = d.toLocaleDateString("en-UG", { day: "numeric", month: "long", year: "numeric" });
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    (acc[label] ||= []).push(t);
    return acc;
  }, {});

  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);

  const typeLabel = (t: Transaction) => {
    const map: Record<string, string> = {
      earning: "Earning",
      withdrawal: "Withdrawal",
      deposit: "Deposit",
      gift_code: "Gift Code",
      achievement: "Achievement",
      referral: "Referral",
      ad_payment: "Ad Payment",
    };
    return map[t.transaction_type] || t.transaction_type.replace(/_/g, " ");
  };

  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Transaction History</CardTitle>
          <div className="text-right text-[11px]">
            <p className="text-success font-semibold">+UGX {totalIn.toLocaleString()}</p>
            <p className="text-destructive font-semibold">−UGX {totalOut.toLocaleString()}</p>
          </div>
        </div>
        <div className="mt-2 flex gap-1 rounded-lg bg-muted p-1">
          {(["all", "in", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === f
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "in" ? "Money In" : "Money Out"}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-2 w-fit rounded-full bg-muted p-3">
              <WalletIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groups).map(([label, items]) => (
              <div key={label}>
                <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <div className="space-y-1">
                  {items.map((transaction) => {
                    const isIn = transaction.amount > 0;
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 p-3 hover:bg-accent/40 transition-colors"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className={`rounded-full p-2 ${
                              isIn ? "bg-success/15" : "bg-destructive/15"
                            }`}
                          >
                            {isIn ? (
                              <ArrowDownLeft className="h-4 w-4 text-success" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {transaction.description || typeLabel(transaction)}
                            </p>
                            <div className="mt-0.5 flex items-center gap-2">
                              <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                                {typeLabel(transaction)}
                              </Badge>
                              <p className="text-[11px] text-muted-foreground">
                                {formatDate(transaction.created_at)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-bold text-sm ${
                              isIn ? "text-success" : "text-destructive"
                            }`}
                          >
                            {isIn ? "+" : "−"}UGX{" "}
                            {Math.abs(transaction.amount).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Bal UGX {Number(transaction.balance_after).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
