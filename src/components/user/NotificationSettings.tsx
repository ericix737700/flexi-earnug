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
    <section aria-label="Notification preferences" className="border-t pt-6">
      <div className="pb-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <BellRing className="h-5 w-5" />
          Account alerts
        </h2>
      </div>
      <div className="divide-y">
        {isLoading || !prefs ? (
          <div className="space-y-3">
            {ITEMS.map((i) => <Skeleton key={i.key} className="h-10 w-full" />)}
          </div>
        ) : (
          ITEMS.map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4 py-4">
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.hint}</p>
              </div>
              <Switch
                checked={prefs[item.key]}
                onCheckedChange={(v) => toggle(item.key, v)}
                aria-label={item.label}
                disabled={update.isPending}
              />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
