import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
      if ((profile as any)?.restrictions?.no_transactions) throw new Error("Your account is restricted from making transactions");

      const amount = Number(withdrawAmount);
      if (isNaN(amount) || amount < minimumWithdrawal) {
        throw new Error(`Minimum withdrawal is UGX ${minimumWithdrawal.toLocaleString()}`);
      }

      if (amount > Number(profile.balance)) {
        throw new Error("Insufficient balance");
      }

      // Create withdrawal request
      const { error } = await supabase.from("withdrawals").insert({
        user_id: profile.user_id,
        amount,
        phone_number: withdrawPhone,
        network: withdrawNetwork,
      });

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
        description: `Withdrawal to ${withdrawNetwork} ${withdrawPhone}`,
      });

      return amount;
    },
    onSuccess: (amount) => {
      toast.success(`Withdrawal of UGX ${amount.toLocaleString()} submitted!`);
      setIsWithdrawOpen(false);
      setWithdrawAmount("");
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
                    <Label>Phone Number</Label>
                    <Input
                      type="tel"
                      placeholder="0700123456"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                    />
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
                    disabled={withdrawMutation.isPending}
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
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : transactions?.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions?.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-muted p-2">
                        {getTransactionIcon(
                          transaction.transaction_type,
                          transaction.amount
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {transaction.description || transaction.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(transaction.created_at)}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`font-semibold ${
                        transaction.amount > 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      UGX {Math.abs(transaction.amount).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UserLayout>
  );
}
