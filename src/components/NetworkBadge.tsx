import { cn } from "@/lib/utils";
import { detectNetwork, NETWORK_LABEL, NETWORK_COLOR, type NetworkProvider } from "@/lib/network";
import { Signal } from "lucide-react";

interface Props {
  phone?: string | null;
  override?: string | null;
  className?: string;
  size?: "sm" | "md";
}

export function NetworkBadge({ phone, override, className, size = "sm" }: Props) {
  const provider: NetworkProvider = (override as NetworkProvider) || detectNetwork(phone);
  if (provider === "unknown") return null;

  const label = NETWORK_LABEL[provider];
  const color = NETWORK_COLOR[provider];
  const sizing = size === "md" ? "text-xs px-2.5 py-1" : "text-[10px] px-2 py-0.5";

  return (
    <span
      role="img"
      aria-label={`${label} network`}
      title={`${label} — SIM network`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wide shadow-sm",
        color,
        sizing,
        className,
      )}
    >
      <Signal className={size === "md" ? "h-3 w-3" : "h-2.5 w-2.5"} />
      {label}
    </span>
  );
}
