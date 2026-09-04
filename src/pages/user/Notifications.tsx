import { FeaturePage } from "@/components/layout/FeaturePage";
import { NotificationsSection } from "@/components/user/NotificationsSection";
import { PushNotificationToggle } from "@/components/user/PushNotificationToggle";
import { NotificationSettings } from "@/components/user/NotificationSettings";

export default function Notifications() {
  return (
    <FeaturePage
      title="Notifications"
      description="Your alerts and notification preferences"
      backTo="/profile"
    >
      <NotificationsSection />
      <PushNotificationToggle />
      <NotificationSettings />
    </FeaturePage>
  );
}
