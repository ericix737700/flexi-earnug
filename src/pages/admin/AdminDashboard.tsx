import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Wallet,
  TrendingUp,
  Clock,
  DollarSign,
  UserPlus,
} from "lucide-react";

export default function AdminDashboard() {
  // Total users
  const { data: totalUsers } = useQuery({
    queryKey: ["admin-total-users"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      return count || 0;
    },
  });

  // Active users (paid registration)
  const { data: activeUsers } = useQuery({
    queryKey: ["admin-active-users"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("registration_paid", true)
        .eq("status", "active");
      return count || 0;
    },
  });

  // Pending withdrawals
  const { data: pendingWithdrawals } = useQuery({
    queryKey: ["admin-pending-withdrawals"],
    queryFn: async () => {
      const { count } = await supabase
        .from("withdrawals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count || 0;
    },
  });

  // Total earnings distributed
  const { data: totalEarnings } = useQuery({
    queryKey: ["admin-total-earnings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("transaction_type", "earning");

      return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    },
  });

  // Registration revenue
  const { data: registrationRevenue } = useQuery({
    queryKey: ["admin-registration-revenue"],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("registration_paid", true);

      // Default 5000 UGX per registration
      return (count || 0) * 5000;
    },
  });

  // Today's new users
  const { data: todayNewUsers } = useQuery({
    queryKey: ["admin-today-users"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .gte("created_at", today);
      return count || 0;
    },
  });

  const stats = [
    {
      title: "Total Users",
      value: totalUsers?.toLocaleString() || "0",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
    {
      title: "Active Users",
      value: activeUsers?.toLocaleString() || "0",
      icon: UserPlus,
      color: "text-success",
      bgColor: "bg-success/20",
    },
    {
      title: "Pending Withdrawals",
      value: pendingWithdrawals?.toLocaleString() || "0",
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/20",
    },
    {
      title: "Earnings Distributed",
      value: `UGX ${(totalEarnings || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: "text-accent",
      bgColor: "bg-accent/20",
    },
    {
      title: "Registration Revenue",
      value: `UGX ${(registrationRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: "text-secondary",
      bgColor: "bg-secondary/20",
    },
    {
      title: "New Today",
      value: todayNewUsers?.toLocaleString() || "0",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/20",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your FlexiEarn platform
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="flex items-center gap-4 py-6">
                <div className={`rounded-lg ${stat.bgColor} p-3`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
