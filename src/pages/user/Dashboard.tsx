import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Calendar,
  Users,
  Play,
  ClipboardList,
  Gift,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = usePlatformSettings();
  const queryClient = useQueryClient();

  // Realtime sync for instant balance updates
  useEffect(() => {
    if (!profile?.user_id) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${profile.user_id}` }, () => {
        refreshProfile();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${profile.user_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["today-earnings"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

  const { data: todayEarnings } = useQuery({
    queryKey: ["today-earnings", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return 0;
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", profile.user_id)
        .eq("transaction_type", "earning")
        .gte("created_at", today);
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    },
    enabled: !!profile?.user_id,
  });

  const { data: referralCount } = useQuery({
    queryKey: ["referral-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by", profile.id)
        .eq("registration_paid", true);
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  const canCheckIn = !profile?.last_checkin_date ||
    new Date(profile.last_checkin_date).toDateString() !== new Date().toDateString();

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.user_id || !canCheckIn) return;
      const reward = settings?.daily_checkin_reward ? Number(settings.daily_checkin_reward) : 100;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];
      const isConsecutive = profile.last_checkin_date === yesterday;
      const newStreak = isConsecutive ? profile.daily_checkin_streak + 1 : 1;
      const newBalance = Number(profile.balance) + reward;
      await supabase.from("profiles").update({ last_checkin_date: today, daily_checkin_streak: newStreak, balance: newBalance }).eq("user_id", profile.user_id);
      await supabase.from("transactions").insert({ user_id: profile.user_id, transaction_type: "earning", amount: reward, balance_after: newBalance, description: `Daily check-in reward (Day ${newStreak})` });
      return { reward, streak: newStreak };
    },
    onSuccess: (data) => {
      if (data) {
        toast.success(`Check-in successful! +UGX ${data.reward.toLocaleString()} (Day ${data.streak} streak)`);
        refreshProfile();
        queryClient.invalidateQueries({ queryKey: ["today-earnings"] });
      }
    },
    onError: () => toast.error("Check-in failed. Please try again."),
  });

  const taskCategories = [
    { title: "Watch Videos", icon: Play, gradient: "from-blue-500/15 to-blue-600/5", iconColor: "text-blue-600 bg-blue-500/15", description: "Earn by watching ads", href: "/tasks?type=video" },
    { title: "Surveys", icon: ClipboardList, gradient: "from-purple-500/15 to-purple-600/5", iconColor: "text-purple-600 bg-purple-500/15", description: "Complete quick surveys", href: "/tasks?type=survey" },
    { title: "Trivia", icon: HelpCircle, gradient: "from-secondary/15 to-secondary/5", iconColor: "text-secondary bg-secondary/15", description: "Answer quiz questions", href: "/tasks?type=trivia" },
    { title: "Referrals", icon: Gift, gradient: "from-primary/15 to-primary/5", iconColor: "text-primary bg-primary/15", description: "Invite friends", href: "/referrals" },
  ];

  return (
    <UserLayout>
      <div className="space-y-5">
        {/* Daily Check-in Card */}
        <Card className="relative overflow-hidden border-0 shadow-md glow-primary">
          <div className="relative gradient-primary p-4">
            <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-secondary/30 blur-2xl" />
            <div aria-hidden className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-primary-foreground/10 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary-foreground/20 p-2.5 backdrop-blur">
                  <Sparkles className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-primary-foreground">Daily Check-in</p>
                  <p className="text-sm text-primary-foreground/80">
                    {canCheckIn
                      ? `Earn UGX ${settings?.daily_checkin_reward || 100}`
                      : `🔥 Streak: ${profile?.daily_checkin_streak || 0} days`}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => checkInMutation.mutate()}
                disabled={!canCheckIn || checkInMutation.isPending}
                size="sm"
                className={canCheckIn
                  ? "gradient-gold border-0 text-secondary-foreground font-bold shadow-md hover:opacity-90 tap-pop"
                  : "bg-primary-foreground/20 text-primary-foreground border-0"}
              >
                {canCheckIn ? "Check In" : "Done ✓"}
              </Button>
            </div>
          </div>
        </Card>


        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: Wallet, label: "Balance", value: `UGX ${Number(profile?.balance || 0).toLocaleString()}`, color: "text-primary", bg: "bg-primary/10" },
            { icon: TrendingUp, label: "Today", value: `+UGX ${(todayEarnings || 0).toLocaleString()}`, color: "text-success", bg: "bg-success/10" },
            { icon: Calendar, label: "Streak", value: `${profile?.daily_checkin_streak || 0} days`, color: "text-secondary", bg: "bg-secondary/10" },
            { icon: Users, label: "Referrals", value: `${referralCount || 0}`, color: "text-blue-600", bg: "bg-blue-500/10" },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/50 shadow-sm">
              <CardContent className="flex items-center gap-3 py-3.5">
                <div className={`rounded-xl p-2 ${stat.bg}`}>
                  <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                  <p className="font-bold text-sm">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Task Categories */}
        <div>
          <h2 className="mb-3 font-bold text-foreground">Earn Money</h2>
          <div className="grid grid-cols-2 gap-3">
            {taskCategories.map((category) => (
              <Card
                key={category.title}
                className={`cursor-pointer border-border/50 bg-gradient-to-br ${category.gradient} shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98]`}
                onClick={() => navigate(category.href)}
              >
                <CardContent className="py-4 text-center">
                  <div className={`mx-auto mb-2.5 w-fit rounded-xl p-2.5 ${category.iconColor}`}>
                    <category.icon className="h-6 w-6" />
                  </div>
                  <p className="font-semibold text-foreground">{category.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{category.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-3.5 border-primary/20 hover:bg-primary/5 font-semibold"
            onClick={() => navigate("/wallet")}
          >
            <Wallet className="mr-2 h-4 w-4 text-primary" />
            Withdraw
          </Button>
          <Button
            className="h-auto py-3.5 gradient-primary border-0 text-primary-foreground font-semibold hover:opacity-90"
            onClick={() => navigate("/referrals")}
          >
            <Users className="mr-2 h-4 w-4" />
            Invite Friends
          </Button>
        </div>
      </div>
    </UserLayout>
  );
}
