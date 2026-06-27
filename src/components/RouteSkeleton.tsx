import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteSkeletonProps {
  variant?: "list" | "grid" | "form";
  className?: string;
}

export function RouteSkeleton({ variant = "list", className }: RouteSkeletonProps) {
  return (
    <div className={cn("space-y-4 p-4", className)}>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-3/4" />
      {variant === "grid" ? (
        <div className="grid grid-cols-2 gap-3 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : variant === "form" ? (
        <div className="space-y-3 pt-2">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
