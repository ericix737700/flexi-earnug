import { ReactNode } from "react";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { PlatformLogo } from "@/components/PlatformLogo";
import { Bell, Wallet } from "lucide-react";

interface UserLayoutProps {
  children: ReactNode;
}

export function UserLayout({ children }: UserLayoutProps) {
  const { profile } = useAuth();
  const { data: settings } = usePlatformSettings();

  const announcement = settings?.platform_announcement;

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
          <div className="flex items-center gap-3">
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
