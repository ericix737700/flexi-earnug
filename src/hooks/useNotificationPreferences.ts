import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface NotificationPreferences {
  wallet_deductions: boolean;
  reward_credits: boolean;
  investment_maturity: boolean;
  promotions: boolean;
  push_enabled: boolean;
}

const DEFAULTS: NotificationPreferences = {
  wallet_deductions: true,
  reward_credits: true,
  investment_maturity: true,
  promotions: true,
  push_enabled: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULTS;
      return {
        wallet_deductions: data.wallet_deductions,
        reward_credits: data.reward_credits,
        investment_maturity: data.investment_maturity,
        promotions: data.promotions,
        push_enabled: data.push_enabled,
      };
    },
  });
}

export function useUpdateNotificationPreference() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
  });
}
