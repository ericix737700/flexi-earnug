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
  Trophy,
  Megaphone,
  Cpu,
  Signal,
} from "lucide-react";

import { AdBanner } from "@/components/user/AdBanner";
import { AdPopup } from "@/components/user/AdPopup";
import { AchievementsSection } from "@/components/user/AchievementsSection";
import { Link } from "react-router-dom";
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
    { title: "Watch Videos", icon: Play, iconColor: "text-primary bg-primary/15", description: "Watch & Earn: short videos", href: "/tasks?type=video" },
    { title: "Surveys", icon: ClipboardList, iconColor: "text-primary bg-primary/15", description: "Quick Survey: share opinions", href: "/tasks?type=survey" },
    { title: "Machines", icon: Cpu, iconColor: "text-primary bg-primary/15", description: "Invest & earn rewards", href: "/machines" },
    { title: "Airtime & Data", icon: Signal, iconColor: "text-primary bg-primary/15", description: "Top up any line", href: "/airtime-data" },
    { title: "Trivia", icon: HelpCircle, iconColor: "text-secondary bg-secondary/15", description: "Answer quiz questions", href: "/tasks?type=trivia" },
    { title: "Achievements", icon: Trophy, iconColor: "text-secondary bg-secondary/15", description: "Claim bonuses", href: "/achievements" },
    { title: "Ads", icon: Megaphone, iconColor: "text-secondary bg-secondary/15", description: "Advertise on FlexiEarn", href: "/ads" },
    { title: "Referrals", icon: Gift, iconColor: "text-primary bg-primary/15", description: "Invite friends", href: "/referrals" },
  ];

  const welcomeMessage =
    settings?.welcome_message?.trim() ||
    "Welcome to FlexiEarn. Introducing Investment Machines — invest once and your reward is credited automatically the moment your machine matures. Secure, transparent and fully managed for you.";

  // Optional activation window set by admins
  const now = Date.now();
  const startsAt = settings?.welcome_message_start ? new Date(settings.welcome_message_start).getTime() : null;
  const endsAt = settings?.welcome_message_end ? new Date(settings.welcome_message_end).getTime() : null;
  const welcomeVisible =
    (!startsAt || Number.isNaN(startsAt) || now >= startsAt) &&
    (!endsAt || Number.isNaN(endsAt) || now <= endsAt);

  return (
    <UserLayout showAnnouncement>
      <div className="space-y-5">
        {/* Welcome message */}
        {welcomeVisible && (
        <Card className="relative overflow-hidden border-0 glass-card">

          <div aria-hidden className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
          <CardContent className="relative flex gap-3 py-4">
            <div className="h-fit rounded-xl bg-primary/15 p-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold">
                Hello{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""} 👋
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{welcomeMessage}</p>
              <Link
                to="/machines"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
              >
                Explore Investment Machines →
              </Link>
            </div>
          </CardContent>
        </Card>
        )}



        {/* Balance */}
        <div className="relative overflow-hidden rounded-2xl card-goldbar px-5 py-6 text-center">
          <div className="absolute right-4 top-4 rounded-full bg-background/20 p-1.5"><Sparkles className="h-4 w-4 text-background" /></div>
          <p className="text-sm font-medium text-background/80">Total Balance</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-background">UGX {Number(profile?.balance || 0).toLocaleString()}</p>
          <p className="mt-1 text-xs font-medium text-background/75">Available Balance · Today +UGX {(todayEarnings || 0).toLocaleString()}</p>
        </div>

        {/* Daily Bonuses */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Daily Bonuses</h2>
            <Link to="/achievements" className="text-xs font-medium text-muted-foreground">View all ›</Link>
          </div>
          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-none">
            <button
              onClick={() => checkInMutation.mutate()}
              disabled={!canCheckIn || checkInMutation.isPending}
              className="w-28 shrink-0 rounded-xl card-neon p-3 text-center tap-pop disabled:opacity-80"
            >
              <Calendar className="mx-auto h-6 w-6 text-primary" />
              <p className="mt-2 text-xs text-foreground">Daily Login</p>
              <p className="text-xs font-bold text-primary">{canCheckIn ? `+${settings?.daily_checkin_reward || 100} UGX` : `🔥 ${profile?.daily_checkin_streak || 0} days`}</p>
            </button>
            {[
              { icon: ClipboardList, label: "Complete Tasks", sub: "Earn rewards", href: "/tasks" },
              { icon: Users, label: "Refer a Friend", sub: `${referralCount || 0} invited`, href: "/referrals" },
              { icon: Trophy, label: "Achievements", sub: "Claim bonus", href: "/achievements" },
              { icon: Gift, label: "Gift Code", sub: "Redeem", href: "/wallet" },
            ].map((b) => (
              <Link key={b.label} to={b.href} className="w-28 shrink-0 rounded-xl card-neon p-3 text-center tap-pop">
                <b.icon className="mx-auto h-6 w-6 text-primary" />
                <p className="mt-2 text-xs text-foreground">{b.label}</p>
                <p className="text-xs font-bold text-primary">{b.sub}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Sponsored banner */}
        <AdBanner placement="dashboard" />

        {/* Achievements teaser */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-bold text-foreground flex items-center gap-1.5"><Trophy className="h-4 w-4 text-secondary" />Achievements</h2>
            <Link to="/achievements" className="text-xs text-primary font-medium">View all</Link>
          </div>
          <AchievementsSection compact />
        </div>



        {/* Earning rows */}
        <div className="space-y-4">
          {taskCategories.map((c) => (
            <div key={c.title}>
              <h2 className="mb-2 font-bold text-foreground">{c.title}</h2>
              <div className="flex items-center gap-3 rounded-2xl glass-card p-3">
                <div className={`shrink-0 rounded-xl p-3 ${c.iconColor}`}><c.icon className="h-7 w-7" /></div>
                <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{c.description}</p>
                <Button size="sm" onClick={() => navigate(c.href)} className="rounded-full gradient-primary border-0 px-5 font-bold text-primary-foreground">Start</Button>
              </div>
            </div>
          ))}
        </div>

      </div>
      <AdPopup />
    </UserLayout>
  );
}
