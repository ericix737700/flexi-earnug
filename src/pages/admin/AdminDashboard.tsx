import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Wallet, TrendingUp, Clock, DollarSign, UserPlus,
} from "lucide-react";

export default function AdminDashboard() {
  const { data: totalUsers } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  const { data: activeUsers } = useQuery({
    queryKey: ["admin-active-users"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("registration_paid", true).eq("status", "active");
      return count || 0;
    },
  });

  const { data: onlineUsers } = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_seen", fiveMinAgo);
      return count || 0;
    },
    refetchInterval: 30000,
  });

  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["admin-pending-withdrawals"],
    queryFn: async () => {
      const { count } = await supabase.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending");
      return count || 0;
    },
  });

  const { data: totalEarnings } = useQuery({
    queryKey: ["admin-total-earnings"],
    queryFn: async () => {
      const { data } = await supabase.from("transactions").select("amount").eq("transaction_type", "earning");
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    },
  });

  const { data: registrationRevenue } = useQuery({
    queryKey: ["admin-registration-revenue"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("registration_paid", true);
      return (count || 0) * 5000;
    },
  });

  const { data: todayNewUsers } = useQuery({
    queryKey: ["admin-today-users"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", today);
      return count || 0;
    },
  });

  const stats = [
    { title: "Total Users", value: totalUsers?.toLocaleString() || "0", icon: Users, color: "text-primary", bgColor: "bg-primary/20" },
    { title: "Active Users", value: activeUsers?.toLocaleString() || "0", icon: UserPlus, color: "text-success", bgColor: "bg-success/20" },
    { title: "Online Now", value: onlineUsers?.toLocaleString() || "0", icon: Users, color: "text-green-500", bgColor: "bg-green-500/20" },
    { title: "Pending Withdrawals", value: pendingWithdrawals?.toLocaleString() || "0", icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500/20" },
    { title: "Earnings Distributed", value: `UGX ${(totalEarnings || 0).toLocaleString()}`, icon: TrendingUp, color: "text-accent", bgColor: "bg-accent/20" },
    { title: "Registration Revenue", value: `UGX ${(registrationRevenue || 0).toLocaleString()}`, icon: DollarSign, color: "text-secondary", bgColor: "bg-secondary/20" },
    { title: "New Today", value: todayNewUsers?.toLocaleString() || "0", icon: Wallet, color: "text-primary", bgColor: "bg-primary/20" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your FlexiEarn platform</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="border-border/50 hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 py-5 px-4">
                <div className={`rounded-xl ${stat.bgColor} p-3`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{stat.title}</p>
                  <p className="text-xl font-bold truncate">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
