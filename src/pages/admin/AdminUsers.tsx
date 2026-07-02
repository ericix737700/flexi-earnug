import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, MoreVertical, Plus, Minus, UserX, UserCheck, Trash2, Loader2,
  Ban, AlertTriangle, Eye, Users, ListTodo, Wallet, Clock, Mail, Key, EyeOff, BadgeCheck,
} from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";

type UserStatus = "pending" | "active" | "suspended" | "blocked";

interface Profile {
  id: string;
  user_id: string;
  phone: string;
  email?: string | null;
  full_name: string | null;
  referral_code: string;
  balance: number;
  registration_paid: boolean;
  status: UserStatus;
  created_at: string;
  last_seen?: string | null;
  device_fingerprint?: string | null;
  restrictions?: { no_transactions?: boolean; no_tasks?: boolean };
  is_verified?: boolean;
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
  const [detailUser, setDetailUser] = useState<Profile | null>(null);
  const [authEmail, setAuthEmail] = useState<string | null>(null);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const loadAuthEmail = async (userId: string) => {
    setLoadingEmail(true);
    setAuthEmail(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "get_email", userId },
      });
      if (error) throw error;
      if (data?.success) setAuthEmail(data.email);
    } catch {
      toast.error("Could not fetch login email");
    } finally {
      setLoadingEmail(false);
    }
  };

  const resetPassword = async () => {
    if (!detailUser || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-actions", {
        body: { action: "reset_password", userId: detailUser.user_id, newPassword },
      });
      if (error || !data?.success) throw new Error(data?.error || "Failed");
      toast.success("Password updated");
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password");
    } finally {
      setResettingPassword(false);
    }
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", search, statusFilter],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (search) query = query.or(`phone.ilike.%${search}%,full_name.ilike.%${search}%`);
      if (statusFilter !== "all") query = query.eq("status", statusFilter as UserStatus);
      const { data, error } = await query;
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Detail queries
  const { data: userTasks } = useQuery({
    queryKey: ["user-tasks", detailUser?.user_id],
    queryFn: async () => {
      if (!detailUser) return [];
      const { data } = await supabase
        .from("task_completions")
        .select("*, tasks(title, task_type)")
        .eq("user_id", detailUser.user_id)
        .order("completed_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!detailUser,
  });

  const { data: referralCount } = useQuery({
    queryKey: ["user-referrals", detailUser?.user_id],
    queryFn: async () => {
      if (!detailUser) return 0;
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", detailUser.user_id);
      return count || 0;
    },
    enabled: !!detailUser,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: UserStatus }) => {
      const { error } = await supabase.from("profiles").update({ status }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("User status updated"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => { toast.error("Failed to update user status"); },
  });

  const toggleVerifiedMutation = useMutation({
    mutationFn: async ({ userId, verified }: { userId: string; verified: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_verified: verified } as any).eq("user_id", userId);
      if (error) throw error;
      return verified;
    },
    onSuccess: (verified) => {
      toast.success(verified ? "User verified" : "Verification removed");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      if (detailUser) setDetailUser({ ...detailUser, is_verified: verified });
    },
    onError: () => { toast.error("Failed to update verification"); },
  });

  const activateAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ registration_paid: true, status: "active" })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account activated without payment");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDetailUser(null);
    },
    onError: () => { toast.error("Failed to activate account"); },
  });

  const adjustBalanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !user) return;
      const amount = Number(adjustAmount);
      if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
      const finalAmount = adjustType === "deduct" ? -amount : amount;
      const newBalance = Number(selectedUser.balance) + finalAmount;
      if (newBalance < 0) throw new Error("Balance cannot be negative");
      await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", selectedUser.user_id);
      await supabase.from("transactions").insert({
        user_id: selectedUser.user_id, transaction_type: "adjustment",
        amount: finalAmount, balance_after: newBalance, description: `Admin adjustment: ${adjustReason}`,
      });
    },
    onSuccess: () => {
      toast.success("Balance adjusted"); setIsAdjustOpen(false); setAdjustAmount(""); setAdjustReason(""); setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: Error) => { toast.error(e.message); },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { toast.success("User deleted"); setDeleteTarget(null); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => { toast.error("Failed to delete user"); },
  });

  const isOnline = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return false;
    return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
  };

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return "Never";
    if (isOnline(lastSeen)) return "Online now";
    const diff = Date.now() - new Date(lastSeen).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(lastSeen).toLocaleDateString("en-UG", { day: "numeric", month: "short" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active": return <Badge className="bg-success text-success-foreground">Active</Badge>;
      case "pending": return <Badge variant="secondary">Pending</Badge>;
      case "suspended": return <Badge variant="destructive">Suspended</Badge>;
      case "blocked": return <Badge variant="destructive">Blocked</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all registered users</p>
        </div>

        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by phone or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((profile) => (
                    <TableRow key={profile.id} className="cursor-pointer" onClick={() => { setDetailUser(profile); loadAuthEmail(profile.user_id); }}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${isOnline(profile.last_seen) ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                          <span className="truncate">{profile.full_name || "N/A"}</span>
                          {profile.is_verified && <VerifiedBadge size="xs" label="Verified by FlexiEarn — trusted account" />}
                        </div>
                      </TableCell>
                      <TableCell>{profile.phone}</TableCell>
                      <TableCell>UGX {Number(profile.balance).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(profile.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatLastSeen(profile.last_seen)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setDetailUser(profile); loadAuthEmail(profile.user_id); }}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(profile); setAdjustType("add"); setIsAdjustOpen(true); }}><Plus className="mr-2 h-4 w-4" />Top Up</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setSelectedUser(profile); setAdjustType("deduct"); setIsAdjustOpen(true); }}><Minus className="mr-2 h-4 w-4" />Deduct</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleVerifiedMutation.mutate({ userId: profile.user_id, verified: !profile.is_verified })}>
                              <BadgeCheck className="mr-2 h-4 w-4 text-[hsl(210_100%_50%)]" />
                              {profile.is_verified ? "Remove Verification" : "Verify User"}
                            </DropdownMenuItem>
                            {profile.status === "active" ? (
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: profile.user_id, status: "suspended" })}><UserX className="mr-2 h-4 w-4" />Suspend</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ userId: profile.user_id, status: "active" })}><UserCheck className="mr-2 h-4 w-4" />Activate</DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => updateStatusMutation.mutate({ userId: profile.user_id, status: "blocked" })}><Ban className="mr-2 h-4 w-4" />Block</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(profile)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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

        {/* User Detail Sheet */}
        <Sheet open={!!detailUser} onOpenChange={(open) => !open && setDetailUser(null)}>
          <SheetContent className="overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${isOnline(detailUser?.last_seen) ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                <span>{detailUser?.full_name || detailUser?.phone}</span>
                {detailUser?.is_verified && <VerifiedBadge size="sm" />}
              </SheetTitle>
            </SheetHeader>
            {detailUser && (
              <div className="mt-6 space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-lg font-bold text-primary">UGX {Number(detailUser.balance).toLocaleString()}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="mt-1">{getStatusBadge(detailUser.status)}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Last Seen</p>
                    <p className="text-sm font-medium">{formatLastSeen(detailUser.last_seen)}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="text-sm font-medium">{formatDate(detailUser.created_at)}</p>
                  </div>
                </div>

                <Separator />

                {/* Stats */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4" /> Referrals</h3>
                  <p className="text-2xl font-bold">{referralCount ?? 0} <span className="text-sm text-muted-foreground font-normal">people referred</span></p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><ListTodo className="h-4 w-4" /> Tasks Completed</h3>
                  <p className="text-2xl font-bold">{userTasks?.length ?? 0} <span className="text-sm text-muted-foreground font-normal">tasks</span></p>
                  {userTasks && userTasks.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {userTasks.map((tc: any) => (
                        <div key={tc.id} className="flex items-center justify-between rounded border p-2 text-sm">
                          <span>{tc.tasks?.title || "Unknown task"}</span>
                          <Badge variant="outline">+UGX {Number(tc.reward_earned).toLocaleString()}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{detailUser.phone}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Referral Code</span><span className="font-mono">{detailUser.referral_code}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Registration</span><span>{detailUser.registration_paid ? "Paid" : "Unpaid"}</span></div>
                  {detailUser.device_fingerprint && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Device ID</span><span className="font-mono text-xs">{detailUser.device_fingerprint}</span></div>
                  )}
                </div>

                <Separator />

                {/* Login Credentials */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Key className="h-4 w-4" /> Login Credentials</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Login Email</p>
                      <p className="font-mono break-all">{loadingEmail ? "Loading..." : (authEmail || "Unknown")}</p>
                    </div>
                    {detailUser.email && (
                      <div>
                        <p className="text-xs text-muted-foreground">Recovery Email</p>
                        <p className="font-mono break-all">{detailUser.email}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1"><Mail className="h-3 w-3" />Set New Password</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Min. 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full" onClick={() => setShowNewPassword((s) => !s)}>
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <Button onClick={resetPassword} disabled={resettingPassword || newPassword.length < 6}>
                        {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset"}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Passwords are hashed and cannot be viewed. Override and share the new one with the user.</p>
                  </div>
                </div>

                <Separator />

                {/* Restrictions */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2"><Ban className="h-4 w-4" /> Restrictions</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Block transactions</span>
                    <Switch
                      checked={!!detailUser.restrictions?.no_transactions}
                      onCheckedChange={async (checked) => {
                        const newR = { ...detailUser.restrictions, no_transactions: checked };
                        await supabase.from("profiles").update({ restrictions: newR } as any).eq("user_id", detailUser.user_id);
                        setDetailUser({ ...detailUser, restrictions: newR });
                        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                        toast.success("Restriction updated");
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Block tasks</span>
                    <Switch
                      checked={!!detailUser.restrictions?.no_tasks}
                      onCheckedChange={async (checked) => {
                        const newR = { ...detailUser.restrictions, no_tasks: checked };
                        await supabase.from("profiles").update({ restrictions: newR } as any).eq("user_id", detailUser.user_id);
                        setDetailUser({ ...detailUser, restrictions: newR });
                        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                        toast.success("Restriction updated");
                      }}
                    />
                  </div>
                </div>

                <Separator />

                {/* Admin Activate / Deactivate Account */}
                {!detailUser.registration_paid ? (
                  <Button
                    className="w-full"
                    onClick={() => activateAccountMutation.mutate(detailUser.user_id)}
                    disabled={activateAccountMutation.isPending}
                  >
                    {activateAccountMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Activating...</>
                    ) : (
                      <><UserCheck className="mr-2 h-4 w-4" />Activate Without Payment</>
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={async () => {
                      await supabase.from("profiles").update({ registration_paid: false, status: "pending" }).eq("user_id", detailUser.user_id);
                      toast.success("Account deactivated — user must pay activation fee again");
                      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
                      setDetailUser({ ...detailUser, registration_paid: false, status: "pending" });
                    }}
                  >
                    <Ban className="mr-2 h-4 w-4" />
                    Deactivate (Require Re-payment)
                  </Button>
                )}
              </div>
            )}
          </SheetContent>
        </Sheet>

        {/* Adjust Balance Dialog */}
        <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{adjustType === "add" ? "Top Up" : "Deduct"} Balance</DialogTitle>
              <DialogDescription>{adjustType === "add" ? "Add funds to" : "Deduct funds from"} {selectedUser?.full_name || selectedUser?.phone}'s account</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Current Balance</Label>
                <p className="text-lg font-bold">UGX {Number(selectedUser?.balance || 0).toLocaleString()}</p>
              </div>
              <div className="space-y-2"><Label>Amount (UGX)</Label><Input type="number" placeholder="Enter amount" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)} /></div>
              <div className="space-y-2"><Label>Reason</Label><Textarea placeholder="Enter reason" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} /></div>
              <Button className="w-full" onClick={() => adjustBalanceMutation.mutate()} disabled={adjustBalanceMutation.isPending}>
                {adjustBalanceMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : `${adjustType === "add" ? "Top Up" : "Deduct"} Balance`}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete User</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{deleteTarget?.full_name || deleteTarget?.phone}</strong>? This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && deleteUserMutation.mutate(deleteTarget.user_id)} disabled={deleteUserMutation.isPending}>
                {deleteUserMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : "Delete User"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
