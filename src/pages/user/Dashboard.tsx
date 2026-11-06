import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserLayout } from "@/components/layout/UserLayout";
import { PlatformLogo } from "@/components/PlatformLogo";
import { AdBanner } from "@/components/user/AdBanner";
import { AdPopup } from "@/components/user/AdPopup";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { useMachinesFeature } from "@/hooks/useMachinesFeature";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell, Wallet, Eye, EyeOff, ArrowDownToLine, Send, CalendarCheck, ClipboardCheck, Users,
  Trophy, ChevronRight, ArrowRight, CheckCircle2, TrendingUp, Smartphone, Megaphone,
  ClipboardList, LayoutGrid, ArrowUpRight, ArrowDownLeft, Gift, Play, Sparkles, Inbox, AlertCircle,
} from "lucide-react";

type Tx = { id: string; amount: number; transaction_type: string; description: string | null; created_at: string };

const txMeta = (t: string) => {
  switch (t) {
    case "deposit": return { icon: ArrowDownLeft, label: "Deposit", credit: true };
    case "withdrawal": return { icon: ArrowUpRight, label: "Withdrawal", credit: false };
    case "earning": return { icon: Play, label: "Task reward", credit: true };
    case "referral": case "referral_bonus": return { icon: Users, label: "Referral bonus", credit: true };
    case "investment": case "investment_purchase": return { icon: TrendingUp, label: "Investment purchase", credit: false };
    case "investment_payout": case "investment_maturity": return { icon: TrendingUp, label: "Investment payout", credit: true };
    case "transfer": return { icon: Send, label: "Transfer", credit: false };
    case "gift_code": return { icon: Gift, label: "Gift code", credit: true };
    default: return { icon: Wallet, label: t.replace(/_/g, " "), credit: true };
  }
};

const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

export default function Dashboard() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const { data: settings } = usePlatformSettings();
  const machines = useMachinesFeature();
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!profile?.user_id) return;
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${profile.user_id}` }, () => refreshProfile())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `user_id=eq.${profile.user_id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["today-earnings"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile?.user_id]);

  const { data: todayEarnings } = useQuery({
    queryKey: ["today-earnings", profile?.user_id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase.from("transactions").select("amount")
        .eq("user_id", profile!.user_id).eq("transaction_type", "earning").gte("created_at", today);
      return data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    },
    enabled: !!profile?.user_id,
  });

  const recent = useQuery({
    queryKey: ["dashboard-recent", profile?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions")
        .select("id, amount, transaction_type, description, created_at")
        .eq("user_id", profile!.user_id).order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return (data || []) as Tx[];
    },
    enabled: !!profile?.user_id,
  });

  const { data: unread } = useQuery({
    queryKey: ["unread-notifications", profile?.user_id],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", profile!.user_id).eq("is_read", false);
      return count || 0;
    },
    enabled: !!profile?.user_id,
  });

  const { data: referralCount } = useQuery({
    queryKey: ["referral-count", profile?.id],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("referred_by", profile!.id).eq("registration_paid", true);
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  const canCheckIn = !profile?.last_checkin_date ||
    new Date(profile.last_checkin_date).toDateString() !== new Date().toDateString();
  const checkinReward = settings?.daily_checkin_reward ? Number(settings.daily_checkin_reward) : 100;

  const checkInMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.user_id || !canCheckIn) return;
      const reward = checkinReward;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const today = new Date().toISOString().split("T")[0];
      const newStreak = profile.last_checkin_date === yesterday ? profile.daily_checkin_streak + 1 : 1;
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
        queryClient.invalidateQueries({ queryKey: ["dashboard-recent"] });
      }
    },
    onError: () => toast.error("Check-in failed. Please try again."),
  });

  const balance = Number(profile?.balance || 0);
  const fmt = (n: number) => (hidden ? "••••••" : `UGX ${n.toLocaleString()}`);
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const referralReward = settings?.referral_bonus || settings?.referral_reward;

  const quickActions = [
    { icon: CalendarCheck, title: "Daily Login", sub: canCheckIn ? `+${checkinReward} UGX` : `${profile?.daily_checkin_streak || 0}-day streak`, onClick: () => canCheckIn && checkInMutation.mutate(), disabled: !canCheckIn || checkInMutation.isPending },
    { icon: ClipboardCheck, title: "Complete Tasks", sub: "Earn rewards", onClick: () => navigate("/tasks") },
    { icon: Users, title: "Refer a Friend", sub: `${referralCount || 0} invited`, onClick: () => navigate("/referrals") },
    { icon: Trophy, title: "Achievements", sub: "Claim bonus", onClick: () => navigate("/achievements") },
  ];

  const features = [
    { icon: CheckCircle2, title: "Tasks", href: "/tasks" },
    { icon: TrendingUp, title: "Investments", href: "/machines", soon: machines.isComingSoon, hide: !machines.isVisible },
    { icon: Smartphone, title: "Airtime & Data", href: "/airtime-data" },
    { icon: Send, title: "Money Transfer", href: "", soon: true },
    { icon: Megaphone, title: "Advertising", href: "/ads" },
    { icon: ClipboardList, title: "Surveys", href: "/earn/surveys" },
    { icon: Trophy, title: "Achievements", href: "/achievements" },
    { icon: LayoutGrid, title: "More Services", href: "/profile" },
  ].filter((f) => !f.hide);

  return (
    <UserLayout showAnnouncement hideHeader>
      {/* Header + balance */}
      <section className="bg-forest rounded-b-[28px] px-4 pb-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-primary-foreground">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <PlatformLogo size="sm" />
            <div className="min-w-0">
              <p className="truncate text-base font-bold leading-tight">FlexiEarn</p>
              <p className="truncate text-xs text-primary-foreground/70">{greeting}, {firstName}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/notifications" aria-label="Notifications" className="relative rounded-full p-2 hover:bg-primary-foreground/10">
              <Bell className="h-5 w-5" />
              {!!unread && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <Link to="/wallet" className="flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1.5 text-xs font-semibold">
              <Wallet className="h-3.5 w-3.5" /> {fmt(balance)}
            </Link>
          </div>
        </div>

        <div className="bg-forest-card mt-5 rounded-2xl border border-primary-foreground/10 p-5 shadow-soft">
          <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
            Total Balance
            <button onClick={() => setHidden((h) => !h)} aria-label={hidden ? "Show balance" : "Hide balance"} className="rounded p-0.5 hover:bg-primary-foreground/10">
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {profile ? (
            <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">{fmt(balance)}</p>
          ) : <Skeleton className="mt-2 h-9 w-48 bg-primary-foreground/15" />}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-primary-foreground/10 pt-3 text-xs">
            <div>
              <p className="text-primary-foreground/65">Available</p>
              <p className="mt-0.5 text-sm font-semibold">{fmt(balance)}</p>
            </div>
            <div>
              <p className="text-primary-foreground/65">Today's earnings</p>
              <p className="mt-0.5 text-sm font-semibold">+{hidden ? "••••" : `UGX ${(todayEarnings || 0).toLocaleString()}`}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => navigate("/wallet/deposit")} className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90">
              <ArrowDownToLine className="h-4 w-4" /> Deposit
            </button>
            <button onClick={() => navigate("/wallet/withdraw")} className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary-foreground/30 text-sm font-semibold hover:bg-primary-foreground/10">
              <Send className="h-4 w-4" /> Withdraw
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-6 px-4 pt-5">
        {/* Quick actions */}
        <div className="grid grid-cols-4 divide-x divide-border rounded-2xl border border-border bg-card py-3 shadow-soft">
          {quickActions.map((a) => (
            <button key={a.title} onClick={a.onClick} disabled={a.disabled} className="flex flex-col items-center gap-1 px-1 text-center disabled:opacity-70">
              <a.icon className="h-6 w-6 text-primary" />
              <span className="text-[11px] font-medium leading-tight text-foreground">{a.title}</span>
              <span className="text-[11px] font-semibold leading-tight text-primary">{a.sub}</span>
            </button>
          ))}
        </div>

        {/* Recent activities */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="border-l-4 border-primary pl-2 text-base font-bold text-foreground">Recent Activities</h2>
            <Link to="/statement" className="flex items-center gap-1 text-xs font-semibold text-primary">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
            {recent.isLoading ? (
              [0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 border-b border-border p-3 last:border-0">
                  <Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                </div>
              ))
            ) : recent.isError ? (
              <div className="flex items-center gap-2 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> Couldn't load activity.
                <button onClick={() => recent.refetch()} className="ml-auto font-semibold underline">Retry</button>
              </div>
            ) : !recent.data?.length ? (
              <div className="flex flex-col items-center gap-1 p-6 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground">Deposits, rewards and payouts will appear here.</p>
              </div>
            ) : (
              recent.data.map((t) => {
                const m = txMeta(t.transaction_type);
                const credit = m.credit && Number(t.amount) >= 0;
                return (
                  <Link to="/statement" key={t.id} className="flex items-center gap-3 border-b border-border p-3 last:border-0 hover:bg-muted/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><m.icon className="h-5 w-5" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold capitalize text-foreground">{m.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.description || m.label} · {timeAgo(t.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${credit ? "text-primary" : "text-foreground"}`}>
                        {credit ? "+" : "-"}UGX {Math.abs(Number(t.amount)).toLocaleString()}
                      </p>
                      <p className="text-[10px] font-medium text-muted-foreground">Completed</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Referral banner */}
        <section className="bg-forest relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-soft">
          <Sparkles aria-hidden className="absolute right-4 top-4 h-16 w-16 text-primary-foreground/10" />
          <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide">Referral program</span>
          <h3 className="mt-2 text-lg font-bold">Invite friends, earn together</h3>
          <p className="mt-1 max-w-xs text-xs text-primary-foreground/75">
            {referralReward ? `Earn UGX ${Number(referralReward).toLocaleString()} for every friend who activates their account.` : "Earn a bonus for every friend who activates their account."}
          </p>
          <button onClick={() => navigate("/referrals")} className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 text-xs font-bold text-foreground">
            Invite Now <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </section>

        <AdBanner placement="dashboard" />

        {/* Quick features */}
        <section>
          <h2 className="mb-3 border-l-4 border-primary pl-2 text-base font-bold text-foreground">Quick Features</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {features.map((f) => {
              const inner = (
                <>
                  {f.soon && <span className="absolute right-1 top-1 rounded bg-muted px-1 text-[8px] font-bold uppercase text-muted-foreground">Soon</span>}
                  <f.icon className={`h-6 w-6 ${f.soon ? "text-muted-foreground" : "text-primary"}`} />
                  <span className={`text-[11px] font-medium leading-tight ${f.soon ? "text-muted-foreground" : "text-foreground"}`}>{f.title}</span>
                </>
              );
              const cls = "relative flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card p-1.5 text-center shadow-soft";
              return f.soon && !f.href ? (
                <button key={f.title} onClick={() => toast.info(`${f.title} is coming soon`)} className={`${cls} opacity-75`}>{inner}</button>
              ) : (
                <Link key={f.title} to={f.href} className={`${cls} hover:border-primary/40`}>{inner}</Link>
              );
            })}
          </div>
        </section>
      </div>
      <AdPopup />
    </UserLayout>
  );
}
