import { FeaturePage } from "@/components/layout/FeaturePage";
import { NotificationsSection } from "@/components/user/NotificationsSection";
import { PushNotificationToggle } from "@/components/user/PushNotificationToggle";
import { NotificationSettings } from "@/components/user/NotificationSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, SlidersHorizontal } from "lucide-react";

export default function Notifications() {
  return (
    <FeaturePage
      title="Notifications"
      backTo="/profile"
    >
      <Tabs defaultValue="inbox" className="space-y-6">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-lg border bg-card p-1">
          <TabsTrigger value="inbox" className="h-10 gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"><Bell className="h-4 w-4" />Inbox</TabsTrigger>
          <TabsTrigger value="preferences" className="h-10 gap-2 data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"><SlidersHorizontal className="h-4 w-4" />Preferences</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox"><NotificationsSection /></TabsContent>
        <TabsContent value="preferences" className="space-y-6">
          <PushNotificationToggle />
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </FeaturePage>
  );
}
