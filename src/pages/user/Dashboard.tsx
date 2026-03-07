import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  // Get today's earnings
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

  // Get referral count
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

  // Check if user can check in today
  const canCheckIn = !profile?.last_checkin_date ||
    new Date(profile.last_checkin_date).toDateString() !== new Date().toDateString();

  // Daily check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.user_id || !canCheckIn) return;

      const reward = settings?.daily_checkin_reward
        ? Number(settings.daily_checkin_reward)
        : 100;

      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

      // Check if streak continues
      const isConsecutive = profile.last_checkin_date === yesterday;
      const newStreak = isConsecutive ? profile.daily_checkin_streak + 1 : 1;
      const newBalance = Number(profile.balance) + reward;

      // Update profile
      await supabase
        .from("profiles")
        .update({
          last_checkin_date: today,
          daily_checkin_streak: newStreak,
          balance: newBalance,
        })
        .eq("user_id", profile.user_id);

      // Create transaction
      await supabase.from("transactions").insert({
        user_id: profile.user_id,
        transaction_type: "earning",
        amount: reward,
        balance_after: newBalance,
        description: `Daily check-in reward (Day ${newStreak})`,
      });

      return { reward, streak: newStreak };
    },
    onSuccess: (data) => {
      if (data) {
        toast.success(
          `Check-in successful! +UGX ${data.reward.toLocaleString()} (Day ${data.streak} streak)`
        );
        refreshProfile();
        queryClient.invalidateQueries({ queryKey: ["today-earnings"] });
      }
    },
    onError: () => {
      toast.error("Check-in failed. Please try again.");
    },
  });

  const taskCategories = [
    {
      title: "Watch Videos",
      icon: Play,
      color: "bg-accent",
      description: "Earn by watching ads",
      href: "/tasks?type=video",
    },
    {
      title: "Surveys",
      icon: ClipboardList,
      color: "bg-secondary",
      description: "Complete quick surveys",
      href: "/tasks?type=survey",
    },
    {
      title: "Trivia",
      icon: HelpCircle,
      color: "bg-primary",
      description: "Answer quiz questions",
      href: "/tasks?type=trivia",
    },
    {
      title: "Referrals",
      icon: Gift,
      color: "bg-success",
      description: "Invite friends",
      href: "/referrals",
    },
  ];

  return (
    <UserLayout>
      <div className="space-y-6">
        {/* Daily Check-in Card */}
        <Card className="border-2 border-primary/50 bg-gradient-to-r from-primary/10 to-accent/10">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary p-2">
                <Calendar className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-semibold">Daily Check-in</p>
                <p className="text-sm text-muted-foreground">
                  {canCheckIn
                    ? `Earn UGX ${settings?.daily_checkin_reward || 100}`
                    : `Streak: ${profile?.daily_checkin_streak || 0} days`}
                </p>
              </div>
            </div>
            <Button
              onClick={() => checkInMutation.mutate()}
              disabled={!canCheckIn || checkInMutation.isPending}
              variant={canCheckIn ? "default" : "secondary"}
              size="sm"
            >
              {canCheckIn ? "Check In" : "Done ✓"}
            </Button>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-primary/20 p-2">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold">
                  UGX {Number(profile?.balance || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-success/20 p-2">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="font-bold">
                  +UGX {(todayEarnings || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-accent/20 p-2">
                <Calendar className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Streak</p>
                <p className="font-bold">{profile?.daily_checkin_streak || 0} days</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="rounded-lg bg-secondary/20 p-2">
                <Users className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Referrals</p>
                <p className="font-bold">{referralCount || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Task Categories */}
        <div>
          <h2 className="mb-3 font-semibold">Earn Money</h2>
          <div className="grid grid-cols-2 gap-3">
            {taskCategories.map((category) => (
              <Card
                key={category.title}
                className="cursor-pointer transition-transform hover:scale-[1.02]"
                onClick={() => navigate(category.href)}
              >
                <CardContent className="py-4 text-center">
                  <div
                    className={`mx-auto mb-2 w-fit rounded-full ${category.color} p-3`}
                  >
                    <category.icon className="h-6 w-6 text-white" />
                  </div>
                  <p className="font-semibold">{category.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-auto py-4"
            onClick={() => navigate("/wallet")}
          >
            <Wallet className="mr-2 h-5 w-5" />
            Withdraw
          </Button>
          <Button
            variant="outline"
            className="h-auto py-4"
            onClick={() => navigate("/referrals")}
          >
            <Users className="mr-2 h-5 w-5" />
            Invite Friends
          </Button>
        </div>
      </div>
    </UserLayout>
  );
}
