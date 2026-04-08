import { ReactNode, useState, useCallback } from "react";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PlatformLogo } from "@/components/PlatformLogo";
import { Bell, Wallet, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  const { profile, refreshProfile } = useAuth();
  const { data: settings } = usePlatformSettings();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const announcement = settings?.platform_announcement;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshProfile();
      await queryClient.invalidateQueries();
      toast.success("Data refreshed");
    } catch {
      // ignore
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  }, [refreshProfile, queryClient]);

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-40 gradient-primary shadow-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <PlatformLogo size="sm" />
            <div>
              <h1 className="text-lg font-bold text-primary-foreground">FlexiEarn</h1>
              <p className="text-xs text-primary-foreground/70">
                Hello, {profile?.full_name || "User"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="rounded-lg p-2 text-primary-foreground/70 hover:bg-primary-foreground/10 transition-colors"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
            <div className="rounded-xl bg-primary-foreground/15 px-3 py-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary-foreground/70" />
                <p className="text-[10px] text-primary-foreground/70">Balance</p>
              </div>
              <p className="font-bold text-primary-foreground">
                UGX {Number(profile?.balance || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Announcement Banner */}
        {announcement && (
          <div className="flex items-center gap-2 bg-secondary px-4 py-2 text-secondary-foreground">
            <Bell className="h-4 w-4" />
            <p className="text-sm font-medium">{announcement}</p>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-lg px-4 py-4">{children}</main>

      {/* Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
