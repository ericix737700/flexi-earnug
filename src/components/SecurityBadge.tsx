import { Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "encrypted" | "e2ee" | "secure-payment" | "ssl";

interface SecurityBadgeProps {
  variant?: Variant;
  className?: string;
}

const CONFIG: Record<Variant, { icon: typeof Lock; label: string }> = {
  encrypted: { icon: Lock, label: "Secured with 256-bit encryption" },
  e2ee: { icon: ShieldCheck, label: "Messages are end-to-end encrypted" },
  "secure-payment": { icon: ShieldCheck, label: "256-bit encrypted secure payment" },
  ssl: { icon: Lock, label: "Protected by SSL / TLS encryption" },
};

export function SecurityBadge({ variant = "encrypted", className }: SecurityBadgeProps) {
  const { icon: Icon, label } = CONFIG[variant];
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="font-medium">{label}</span>
    </div>
  );
}
