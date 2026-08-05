import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
  type NotificationPreferences,
} from "@/hooks/useNotificationPreferences";

const ITEMS: { key: keyof NotificationPreferences; label: string; hint: string }[] = [
  { key: "wallet_deductions", label: "Wallet deductions", hint: "Withdrawals, purchases and fees" },
  { key: "reward_credits", label: "Reward credits", hint: "Task rewards, bonuses and gift codes" },
  { key: "investment_maturity", label: "Investment maturity", hint: "When a machine completes and pays out" },
  { key: "promotions", label: "News & promotions", hint: "Platform news, offers and announcements" },
];

export function NotificationSettings() {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotificationPreference();

  const toggle = (key: keyof NotificationPreferences, value: boolean) => {
    update.mutate(
      { [key]: value } as Partial<NotificationPreferences>,
      { onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not save") }
    );
  };

  return (
    <Card className="glass-card border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-5 w-5" />
          What you get notified about
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !prefs ? (
          <div className="space-y-3">
            {ITEMS.map((i) => <Skeleton key={i.key} className="h-10 w-full" />)}
          </div>
        ) : (
          ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={(v) => toggle(item.key, v)}
                aria-label={item.label}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
