import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { ShieldAlert, Wrench, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Props {
  children: ReactNode;
}

/**
 * Blocks the app for normal users when maintenance or emergency mode is on.
 * Admins can still access the app freely.
 */
export function MaintenanceGate({ children }: Props) {
  const { isAdmin, signOut } = useAuth();
  const { data: settings } = usePlatformSettings();
  const navigate = useNavigate();

  const emergency = settings?.emergency_mode === "true";
  const maintenance = settings?.maintenance_mode === "true";

  if (isAdmin || (!emergency && !maintenance)) {
    return <>{children}</>;
  }

  const isEmergency = emergency;
  const title = isEmergency ? "Emergency Lockdown" : "Under Maintenance";
  const message = isEmergency
    ? settings?.emergency_message ||
      "Emergency lockdown is active. All activity is temporarily paused."
    : settings?.maintenance_message ||
      "We are performing scheduled maintenance. Please check back shortly.";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen app-bg flex items-center justify-center p-6">
      <div className="glass-card max-w-md w-full rounded-2xl p-8 text-center space-y-5">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${
            isEmergency ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-600"
          } animate-pulse`}
        >
          {isEmergency ? <ShieldAlert className="h-8 w-8" /> : <Wrench className="h-8 w-8" />}
        </div>
        <h1 className="text-2xl font-bold text-gradient-primary">{title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        <Button variant="outline" className="w-full" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
