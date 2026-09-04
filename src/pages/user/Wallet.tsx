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
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { transactionLabel } from "@/lib/transactions";
import { GiftCodeRedeem } from "@/components/user/GiftCodeRedeem";
import { useWithdrawalFee } from "@/hooks/useWithdrawalFee";
import { Info } from "lucide-react";


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
        queryClient.invalidateQueries({ queryKey: ["statement"] });
        refreshProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${profile.user_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["pending-withdrawals"] });
        refreshProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deposits', filter: `user_id=eq.${profile.user_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        refreshProfile();
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

  const fee = useWithdrawalFee();
  const requestedAmount = Number(withdrawAmount) || 0;
  const feeAmount = fee.calculate(requestedAmount);
  const totalDeducted = requestedAmount + feeAmount;

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
        .limit(5);

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

      const feeAmount = fee.calculate(amount);
      const totalDebit = amount + feeAmount;

      if (totalDebit > Number(profile.balance)) {
        throw new Error("Insufficient balance to cover the amount and processing fee");
      }

      // Create withdrawal request
      const { data: withdrawalRow, error } = await supabase.from("withdrawals").insert({
        user_id: profile.user_id,
        amount,
        phone_number: withdrawPhone,
        network: withdrawNetwork,
      }).select("id").single();

      if (error) throw error;

      // Deduct from balance (amount + processing fee)
      const newBalance = Number(profile.balance) - totalDebit;
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", profile.user_id);

      // Create transaction
      await supabase.from("transactions").insert({
        user_id: profile.user_id,
        transaction_type: "withdrawal",
        amount: -totalDebit,
        balance_after: newBalance,
        description:
          `Withdrawal to ${recipientName} (${withdrawNetwork} ${withdrawPhone})` +
          (feeAmount > 0 ? ` — incl. UGX ${feeAmount.toLocaleString()} processing fee` : ""),
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
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="lg"
                className="rounded-xl font-semibold tap-pop"
                onClick={() => navigate("/wallet/deposit")}
              >
                <ArrowDownLeft className="mr-2 h-5 w-5" />
                Deposit
              </Button>
              <Button
                size="lg"
                className="gradient-primary rounded-xl border-0 font-semibold text-primary-foreground shadow-md hover:opacity-95 tap-pop"
                onClick={() => navigate("/wallet/withdraw")}
              >
                <WalletIcon className="mr-2 h-5 w-5" />
                Withdraw
              </Button>
            </div>

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
  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Transactions</CardTitle>
          <Link to="/statement" className="text-xs font-semibold text-primary">
            View full statement
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-2 w-fit rounded-full bg-muted p-3">
              <WalletIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((transaction) => {
              const isIn = transaction.amount > 0;
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-card/40 p-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`rounded-full p-2 ${isIn ? "bg-success/15" : "bg-destructive/15"}`}>
                      {isIn ? (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {transaction.description ||
                          transactionLabel(transaction.transaction_type, transaction.amount)}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="outline" className="h-4 px-1.5 text-[10px] font-normal">
                          {transactionLabel(transaction.transaction_type, transaction.amount)}
                        </Badge>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${isIn ? "text-success" : "text-destructive"}`}>
                      {isIn ? "+" : "−"}UGX {Math.abs(transaction.amount).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Bal UGX {Number(transaction.balance_after).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}

            <Button asChild variant="outline" className="mt-3 w-full rounded-xl">
              <Link to="/statement">
                <FileText className="mr-2 h-4 w-4" />
                View full statement
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
