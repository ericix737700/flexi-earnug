import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles, Target, Trophy, Crown, Flame, Users as UsersIcon,
  Award, CheckCircle, Loader2, Coins,
} from "lucide-react";

const ICONS: Record<string, any> = {
  Sparkles, Target, Trophy, Crown, Flame, Users: UsersIcon, Award,
};

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string | null;
  achievement_type: "first_task" | "tasks_count" | "login_streak" | "referrals" | "custom";
  threshold: number;
  reward_amount: number;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
}

export function AchievementsSection({ compact = false }: { compact?: boolean }) {
  const { profile, refreshProfile } = useAuth();
  const queryClient = useQueryClient();

  const { data: achievements, isLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("achievements").select("*").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data as Achievement[];
    },
  });

  const { data: claims } = useQuery({
    queryKey: ["achievement-claims", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return [];
      const { data } = await (supabase as any)
        .from("achievement_claims").select("achievement_id").eq("user_id", profile.user_id);
      return (data || []).map((c: any) => c.achievement_id);
    },
    enabled: !!profile?.user_id,
  });

  const { data: taskCount } = useQuery({
    queryKey: ["user-task-total", profile?.user_id],
    queryFn: async () => {
      if (!profile?.user_id) return 0;
      const { count } = await supabase
        .from("task_completions").select("*", { count: "exact", head: true })
        .eq("user_id", profile.user_id);
      return count || 0;
    },
    enabled: !!profile?.user_id,
  });

  const { data: referralCount } = useQuery({
    queryKey: ["profile-referral-count", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count } = await supabase
        .from("profiles").select("*", { count: "exact", head: true })
        .eq("referred_by", profile.id);
      return count || 0;
    },
    enabled: !!profile?.id,
  });

  const claimMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      const { data, error } = await (supabase as any).rpc("claim_achievement", {
        _achievement_id: achievementId,
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Failed to claim");
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`🎉 +UGX ${Number(data.reward).toLocaleString()} bonus claimed!`);
      refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["achievement-claims"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getProgress = (a: Achievement) => {
    if (a.achievement_type === "first_task" || a.achievement_type === "tasks_count")
      return taskCount || 0;
    if (a.achievement_type === "login_streak") return profile?.daily_checkin_streak || 0;
    if (a.achievement_type === "referrals") return referralCount || 0;
    return 0;
  };

  if (isLoading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const items = compact ? achievements?.slice(0, 3) : achievements;

  return (
    <div className="space-y-2.5">
      {items?.map((a) => {
        const claimed = claims?.includes(a.id);
        const progress = getProgress(a);
        const pct = Math.min(100, Math.round((progress / a.threshold) * 100));
        const eligible = progress >= a.threshold && !claimed;
        const Icon = (a.icon && ICONS[a.icon]) || Award;
        return (
          <Card key={a.id} className={claimed ? "opacity-60" : ""}>
            <CardContent className="py-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className={`rounded-xl p-2 ${eligible ? "bg-secondary/20" : "bg-primary/10"}`}>
                    <Icon className={`h-5 w-5 ${eligible ? "text-secondary" : "text-primary"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{a.title}</p>
                    {a.description && <p className="text-xs text-muted-foreground line-clamp-1">{a.description}</p>}
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1 text-xs">
                        <Coins className="h-3 w-3" />UGX {Number(a.reward_amount).toLocaleString()}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">{Math.min(progress, a.threshold)}/{a.threshold}</span>
                    </div>
                    <Progress value={pct} className="mt-2 h-1.5" />
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={!eligible || claimMutation.isPending}
                  onClick={() => claimMutation.mutate(a.id)}
                  className={eligible ? "gradient-gold border-0 text-secondary-foreground font-bold" : ""}
                  variant={claimed || !eligible ? "outline" : "default"}
                >
                  {claimed ? <><CheckCircle className="mr-1 h-3.5 w-3.5" />Claimed</> : eligible ? "Claim" : "Locked"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
