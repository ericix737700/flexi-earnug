import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_at: string;
}

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*");

      if (error) throw error;

      // Convert to a key-value object for easier access
      const settings: Record<string, string> = {};
      (data as PlatformSetting[]).forEach((setting) => {
        settings[setting.setting_key] = setting.setting_value;
      });

      return settings;
    },
  });
}

export function useUpdatePlatformSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      key,
      value,
    }: {
      key: string;
      value: string;
    }) => {
      const { error } = await supabase
        .from("platform_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });
}
