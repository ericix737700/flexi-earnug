import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "xs" | "sm" | "md" | "lg";

const sizeMap: Record<Size, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

interface VerifiedBadgeProps {
  size?: Size;
  className?: string;
  label?: string;
}

/**
 * Blue verified tick, similar to social platforms.
 * Awarded by admins to trusted / verified accounts.
 */
export function VerifiedBadge({ size = "sm", className, label }: VerifiedBadgeProps) {
  const resolvedLabel = label ?? "Verified by FlexiEarn — trusted account";
  return (
    <span
      role="img"
      aria-label={resolvedLabel}
      title={resolvedLabel}
      className={cn("inline-flex items-center justify-center text-[hsl(210_100%_50%)]", className)}
    >
      <BadgeCheck className={cn(sizeMap[size], "fill-[hsl(210_100%_50%)] text-white")} strokeWidth={2.5} />
    </span>
  );
}
