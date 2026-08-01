import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export type MachinesFeatureStatus = "active" | "coming_soon" | "disabled";

export function useMachinesFeature() {
  const { data: settings, isLoading } = usePlatformSettings();

  const status = (settings?.feature_machines_status as MachinesFeatureStatus) || "coming_soon";
  const activatedAt = settings?.feature_machines_activated_at || "";
  const badgeDays = Number(settings?.feature_machines_new_badge_days || 7);

  let showNewBadge = false;
  if (status === "active" && activatedAt) {
    const activated = new Date(activatedAt).getTime();
    if (!Number.isNaN(activated)) {
      showNewBadge = Date.now() - activated < badgeDays * 24 * 3600 * 1000;
    }
  }

  return {
    isLoading,
    status,
    // Visible in navigation unless fully disabled
    isVisible: status !== "disabled",
    isActive: status === "active",
    isComingSoon: status === "coming_soon",
    showNewBadge,
  };
}
