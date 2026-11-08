import { Switch } from "@/components/ui/switch";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationToggle() {
  const {
    isSupported,
    isSubscribed,
    permission,
    isLoading,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  if (!isSupported) {
    return (
      <section aria-label="Device notifications" className="flex items-start gap-3 py-4">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <div><h2 className="font-semibold">Device notifications unavailable</h2><p className="mt-1 text-sm text-muted-foreground">This browser doesn't support push notifications. Your alerts are still available in your inbox.</p></div>
      </section>
    );
  }

  const handleToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  return (
    <section aria-label="Device notifications">
      <div className="pb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Bell className="h-5 w-5" />
          Device notifications
        </h2>
      </div>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">
              {isSubscribed ? "Notifications enabled" : "Enable notifications"}
            </p>
            <p className="text-xs text-muted-foreground">
              {permission === "denied"
                ? "Notifications blocked in browser settings"
                : "Receive important alerts even when the app is closed"}
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              checked={isSubscribed}
              onCheckedChange={handleToggle}
              disabled={permission === "denied"}
              aria-label="Enable device notifications"
            />
          )}
        </div>
        
        {permission === "denied" && (
          <p className="text-xs text-destructive">
            Please enable notifications in your browser settings to receive alerts.
          </p>
        )}
      </div>
    </section>
  );
}
