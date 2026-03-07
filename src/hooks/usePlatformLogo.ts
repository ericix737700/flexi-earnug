import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePlatformLogo() {
  const { data: logoUrl } = useQuery({
    queryKey: ["platform-logo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("setting_value")
        .eq("setting_key", "platform_logo")
        .single();

      if (error || !data?.setting_value) return null;
      return data.setting_value;
    },
  });

  return logoUrl || null;
}
