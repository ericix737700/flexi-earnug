import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  MoreVertical,
  Plus,
  Minus,
  UserX,
  UserCheck,
  Trash2,
  Loader2,
  Ban,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

type UserStatus = "pending" | "active" | "suspended" | "blocked";

interface Profile {
  id: string;
  user_id: string;
  phone: string;
  full_name: string | null;
  referral_code: string;
  balance: number;
  registration_paid: boolean;
  status: UserStatus;
  created_at: string;
}

export default function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustType, setAdjustType] = useState<"add" | "deduct">("add");
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (search) {
        query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter as UserStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Update user status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: UserStatus }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Failed to update user status");
    },
  });

  // Adjust balance
  const adjustBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !user) return;

      const amount = Number(adjustAmount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount");
      }

      const finalAmount = adjustType === "deduct" ? -amount : amount;
      const newBalance = Number(selectedUser.balance) + finalAmount;

      if (newBalance < 0) {
        throw new Error("Balance cannot be negative");
      }

      // Update balance
      await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", selectedUser.user_id);

      // Log adjustment
      await supabase.from("balance_adjustments").insert({
        user_id: selectedUser.user_id,
        admin_id: user.id,
        amount: finalAmount,
        reason: adjustReason,
      });

      // Create transaction
      await supabase.from("transactions").insert({
        user_id: selectedUser.user_id,
        transaction_type: "adjustment",
        amount: finalAmount,
        balance_after: newBalance,
        description: `Admin adjustment: ${adjustReason}`,
        admin_id: user.id,
      });
    },
    onSuccess: () => {
      toast.success("Balance adjusted successfully");
      setIsAdjustOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete user
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId },
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("User deleted successfully");
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => {
      toast.error("Failed to delete user");
    },
  });
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-success">Active</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "suspended":
        return <Badge variant="destructive">Suspended</Badge>;
      case "blocked":
        return <Badge variant="destructive">Blocked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-UG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage all registered users
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell className="font-medium">
                        {profile.full_name || "N/A"}
                      </TableCell>
                      <TableCell>{profile.phone}</TableCell>
                      <TableCell>
                        UGX {Number(profile.balance).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(profile.status)}</TableCell>
                      <TableCell>{formatDate(profile.created_at)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(profile);
                                setAdjustType("add");
                                setIsAdjustOpen(true);
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Top Up Balance
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(profile);
                                setAdjustType("deduct");
                                setIsAdjustOpen(true);
                              }}
                            >
                              <Minus className="mr-2 h-4 w-4" />
                              Deduct Balance
                            </DropdownMenuItem>
                            {profile.status === "active" ? (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    userId: profile.user_id,
                                    status: "suspended",
                                  })
                                }
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                Suspend User
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateStatusMutation.mutate({
                                    userId: profile.user_id,
                                    status: "active",
                                  })
                                }
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                Activate User
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                updateStatusMutation.mutate({
                                  userId: profile.user_id,
                                  status: "blocked",
                                })
                              }
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Block User
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteTarget(profile)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Adjust Balance Dialog */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {adjustType === "add" ? "Top Up" : "Deduct"} Balance
              </DialogTitle>
              <DialogDescription>
                {adjustType === "add" ? "Add funds to" : "Deduct funds from"}{" "}
                {selectedUser?.full_name || selectedUser?.phone}'s account
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Balance</Label>
                <p className="text-lg font-bold">
                  UGX {Number(selectedUser?.balance || 0).toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Amount (UGX)</Label>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  placeholder="Enter reason for this adjustment"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={() => adjustBalanceMutation.mutate()}
                disabled={adjustBalanceMutation.isPending}
              >
                {adjustBalanceMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `${adjustType === "add" ? "Top Up" : "Deduct"} Balance`
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Delete User Permanently
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete{" "}
                <strong>{deleteTarget?.full_name || deleteTarget?.phone}</strong>? This action
                cannot be undone. All user data, balances, and transaction history will be
                permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.user_id)}
                disabled={deleteUserMutation.isPending}
              >
                {deleteUserMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete User"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
