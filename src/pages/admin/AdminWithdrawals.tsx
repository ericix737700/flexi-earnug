import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Smartphone,
} from "lucide-react";

type WithdrawalStatus = "pending" | "approved" | "processed" | "rejected";

interface Withdrawal {
  id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  network: string;
  status: WithdrawalStatus;
  rejection_reason: string | null;
  created_at: string;
  user_name: string | null;
  user_phone: string | null;
}

export default function AdminWithdrawals() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(
    null
  );
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch withdrawals with separate profile query
  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("withdrawals")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as WithdrawalStatus);
      }

      const { data: withdrawalsData, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = withdrawalsData?.map(w => w.user_id) || [];
      const uniqueUserIds = [...new Set(userIds)];
      
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", uniqueUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      return withdrawalsData?.map(w => ({
        ...w,
        user_name: profileMap.get(w.user_id)?.full_name || null,
        user_phone: profileMap.get(w.user_id)?.phone || null,
      })) as Withdrawal[];
    },
  });

  // Approve & send via MarzPay
  const approveMutation = useMutation({
    mutationFn: async (withdrawal: Withdrawal) => {
      if (!user) return;

      // Call MarzPay send-money edge function
      const { data, error } = await supabase.functions.invoke("marzpay-send", {
        body: {
          withdrawal_id: withdrawal.id,
          amount: withdrawal.amount,
          phone_number: withdrawal.phone_number,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Create notification for user
      await supabase.from("notifications").insert({
        user_id: withdrawal.user_id,
        title: "Withdrawal Processing",
        message: `Your withdrawal of UGX ${withdrawal.amount.toLocaleString()} is being sent to ${withdrawal.network} ${withdrawal.phone_number}.`,
        notification_type: "transaction",
      });
    },
    onSuccess: () => {
      toast.success("Withdrawal approved and payment initiated via MarzPay!");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to process withdrawal");
    },
  });

  // Mark as processed
  const processedMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("withdrawals")
        .update({
          status: "processed" as WithdrawalStatus,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      if (error) throw error;

       // Get withdrawal details for notification
       const { data: withdrawal } = await supabase
         .from("withdrawals")
         .select("user_id, amount")
         .eq("id", withdrawalId)
         .single();

       if (withdrawal) {
         await supabase.from("notifications").insert({
           user_id: withdrawal.user_id,
           title: "Withdrawal Processed",
           message: `Your withdrawal of UGX ${withdrawal.amount.toLocaleString()} has been successfully processed.`,
           notification_type: "transaction",
         });
       }
    },
    onSuccess: () => {
      toast.success("Withdrawal marked as processed");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: () => {
      toast.error("Failed to update withdrawal");
    },
  });

  // Reject withdrawal
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedWithdrawal) return;

      // Refund the user's balance
      const { data: profileData } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", selectedWithdrawal.user_id)
        .single();

      if (profileData) {
        const newBalance = Number(profileData.balance) + selectedWithdrawal.amount;
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("user_id", selectedWithdrawal.user_id);

        // Create refund transaction
        await supabase.from("transactions").insert({
          user_id: selectedWithdrawal.user_id,
          transaction_type: "adjustment",
          amount: selectedWithdrawal.amount,
          balance_after: newBalance,
          description: `Withdrawal rejected: ${rejectionReason}`,
        });
      }

      // Update withdrawal status
      const { error } = await supabase
        .from("withdrawals")
        .update({
          status: "rejected" as WithdrawalStatus,
          rejection_reason: rejectionReason,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedWithdrawal.id);

      if (error) throw error;

       // Create notification for user
       await supabase.from("notifications").insert({
         user_id: selectedWithdrawal.user_id,
         title: "Withdrawal Rejected",
         message: `Your withdrawal was rejected and UGX ${selectedWithdrawal.amount.toLocaleString()} has been refunded. Reason: ${rejectionReason}`,
         notification_type: "transaction",
       });
    },
    onSuccess: () => {
      toast.success("Withdrawal rejected and balance refunded");
      setIsRejectOpen(false);
      setSelectedWithdrawal(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
    },
    onError: () => {
      toast.error("Failed to reject withdrawal");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge className="bg-accent text-accent-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "processed":
        return (
          <Badge className="bg-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Processed
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Withdrawals</h1>
            <p className="text-muted-foreground">
              Manage user withdrawal requests
            </p>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Withdrawals Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : withdrawals?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No withdrawals found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals?.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-medium">
                        {withdrawal.user_name || withdrawal.user_phone || "N/A"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        UGX {withdrawal.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Smartphone className="h-4 w-4" />
                          {withdrawal.network}
                        </div>
                      </TableCell>
                      <TableCell>{withdrawal.phone_number}</TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>{formatDate(withdrawal.created_at)}</TableCell>
                      <TableCell>
                        {withdrawal.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(withdrawal)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedWithdrawal(withdrawal);
                                setIsRejectOpen(true);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {withdrawal.status === "approved" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => processedMutation.mutate(withdrawal.id)}
                            disabled={processedMutation.isPending}
                          >
                            Mark Processed
                          </Button>
                        )}
                        {withdrawal.status === "rejected" &&
                          withdrawal.rejection_reason && (
                            <span className="text-sm text-muted-foreground">
                              {withdrawal.rejection_reason}
                            </span>
                          )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Reject Dialog */}
        <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Withdrawal</DialogTitle>
              <DialogDescription>
                The user's balance will be refunded. Please provide a reason.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Rejection Reason</Label>
                <Textarea
                  placeholder="Enter reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => rejectMutation.mutate()}
                disabled={rejectMutation.isPending || !rejectionReason}
              >
                {rejectMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Reject & Refund"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
