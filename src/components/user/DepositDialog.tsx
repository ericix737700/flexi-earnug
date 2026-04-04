import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Loader2, CheckCircle, Smartphone } from "lucide-react";

interface DepositDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DepositDialog({ open, onOpenChange }: DepositDialogProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Listen for deposit status changes in realtime
  useEffect(() => {
    if (!user?.id || !success) return;

    const channel = supabase
      .channel('deposit-status')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'deposits', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.new.status === 'approved') {
          refreshProfile();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${user.id}` }, () => {
        refreshProfile();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, success]);

  const handleSubmit = async () => {
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
      // Create a pending deposit record first
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

      // Call MarzPay collect edge function
      const { data, error } = await supabase.functions.invoke("marzpay-collect", {
        body: {
          amount: amountNum,
          phone_number: phoneNumber.trim(),
          deposit_id: deposit.id,
        },
      });

      if (error) throw error;

      if (data?.error) {
        // Clean up failed deposit
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

  const handleClose = () => {
    onOpenChange(false);
    setAmount("");
    setPhoneNumber(profile?.phone || "");
    setSuccess(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            {success
              ? "A payment prompt has been sent to your phone"
              : "Enter the amount and your mobile money number to deposit"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <p className="font-semibold text-lg">Payment Request Sent!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please check your phone and approve the Mobile Money payment prompt.
                Your account will be credited automatically once payment is confirmed.
              </p>
            </div>
            <Button className="w-full" onClick={handleClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deposit-amount">Amount (UGX)</Label>
              <Input
                id="deposit-amount"
                type="number"
                placeholder="e.g. 10000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={500}
                max={10000000}
              />
              <p className="text-xs text-muted-foreground">
                Min: UGX 500 · Max: UGX 10,000,000
              </p>
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
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                MTN or Airtel Money number. You'll receive a prompt to approve.
              </p>
            </div>

            <div className="rounded-lg border border-secondary bg-secondary/10 p-3">
              <p className="text-sm text-secondary-foreground">
                <strong>How it works:</strong> A payment prompt will be sent to your
                phone. Approve it to complete the deposit. Your account will be
                credited automatically.
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
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
      </DialogContent>
    </Dialog>
  );
}
