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
  Receipt,
} from "lucide-react";

type DepositStatus = "pending" | "approved" | "rejected";

interface Deposit {
  id: string;
  user_id: string;
  amount: number;
  transaction_id: string;
  status: DepositStatus;
  rejection_reason: string | null;
  created_at: string;
  user_name: string | null;
  user_phone: string | null;
}

export default function AdminDeposits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Fetch deposits with profile info
  const { data: deposits, isLoading } = useQuery({
    queryKey: ["admin-deposits", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("deposits")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as DepositStatus);
      }

      const { data: depositsData, error } = await query;
      if (error) throw error;

      // Fetch profiles separately
      const userIds = depositsData?.map((d) => d.user_id) || [];
      const uniqueUserIds = [...new Set(userIds)];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", uniqueUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]));

      return depositsData?.map((d) => ({
        ...d,
        user_name: profileMap.get(d.user_id)?.full_name || null,
        user_phone: profileMap.get(d.user_id)?.phone || null,
      })) as Deposit[];
    },
  });

  // Approve deposit and credit balance
  const approveMutation = useMutation({
    mutationFn: async (deposit: Deposit) => {
      if (!user) return;

      // Get current balance
      const { data: profileData } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", deposit.user_id)
        .single();

      if (profileData) {
        const newBalance = Number(profileData.balance) + deposit.amount;

        // Update user balance
        await supabase
          .from("profiles")
          .update({ balance: newBalance })
          .eq("user_id", deposit.user_id);

        // Create transaction record
        await supabase.from("transactions").insert({
          user_id: deposit.user_id,
          transaction_type: "earning",
          amount: deposit.amount,
          balance_after: newBalance,
          description: `Deposit approved - Ref: ${deposit.transaction_id}`,
          admin_id: user.id,
        });

         // Create notification for user
         await supabase.from("notifications").insert({
           user_id: deposit.user_id,
           title: "Deposit Approved",
           message: `Your deposit of UGX ${deposit.amount.toLocaleString()} has been approved and credited to your account.`,
           notification_type: "transaction",
         });
      }

      // Update deposit status
      const { error } = await supabase
        .from("deposits")
        .update({
          status: "approved" as DepositStatus,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", deposit.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Deposit approved and balance credited");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
    },
    onError: () => {
      toast.error("Failed to approve deposit");
    },
  });

  // Reject deposit
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedDeposit) return;

      const { error } = await supabase
        .from("deposits")
        .update({
          status: "rejected" as DepositStatus,
          rejection_reason: rejectionReason,
          processed_by: user.id,
          processed_at: new Date().toISOString(),
        })
        .eq("id", selectedDeposit.id);

      if (error) throw error;

       // Create notification for user
       await supabase.from("notifications").insert({
         user_id: selectedDeposit.user_id,
         title: "Deposit Rejected",
         message: `Your deposit request was rejected. Reason: ${rejectionReason}`,
         notification_type: "transaction",
       });
    },
    onSuccess: () => {
      toast.success("Deposit rejected");
      setIsRejectOpen(false);
      setSelectedDeposit(null);
      setRejectionReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
    },
    onError: () => {
      toast.error("Failed to reject deposit");
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
          <Badge className="bg-success">
            <CheckCircle className="mr-1 h-3 w-3" />
            Approved
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
            <h1 className="text-2xl font-bold">Deposits</h1>
            <p className="text-muted-foreground">
              Verify and approve user deposit requests
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
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Deposits Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : deposits?.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No deposits found
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits?.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">
                        {deposit.user_name || deposit.user_phone || "N/A"}
                      </TableCell>
                      <TableCell className="font-semibold">
                        UGX {deposit.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          <span className="font-mono text-sm">
                            {deposit.transaction_id}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell>{formatDate(deposit.created_at)}</TableCell>
                      <TableCell>
                        {deposit.status === "pending" && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => approveMutation.mutate(deposit)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedDeposit(deposit);
                                setIsRejectOpen(true);
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {deposit.status === "rejected" &&
                          deposit.rejection_reason && (
                            <span className="text-sm text-muted-foreground">
                              {deposit.rejection_reason}
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
              <DialogTitle>Reject Deposit</DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this deposit request.
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
                  "Reject Deposit"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
