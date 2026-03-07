import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      <Card>
        <CardContent className="flex items-center gap-3 py-4">
          <BellOff className="h-5 w-5 text-muted-foreground" />
          <span className="text-muted-foreground">
            Push notifications not supported in this browser
          </span>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
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
            />
          )}
        </div>
        
        {permission === "denied" && (
          <p className="text-xs text-destructive">
            Please enable notifications in your browser settings to receive alerts.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
