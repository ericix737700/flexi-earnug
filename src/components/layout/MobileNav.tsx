import { Link, useLocation } from "react-router-dom";
import { Home, User, Wallet, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = {
  href: string;
  icon: React.ElementType;
  label: string;
};

const leftItems: Item[] = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/tasks", icon: Trophy, label: "Earn" },
];

const rightItems: Item[] = [
  { href: "/machines", icon: TrendingUp, label: "Invest" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const location = useLocation();

  const renderItem = (item: Item) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        key={item.label}
        to={item.href}
        className={cn(
          "group relative flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium tap-pop",
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <div
          className={cn(
            "relative flex items-center justify-center rounded-2xl p-2 transition-all duration-300",
            isActive ? "bg-primary/15" : "bg-transparent group-hover:bg-muted/50"
          )}
        >
          <item.icon className={cn("h-5 w-5 transition-transform", isActive && "stroke-[2.5]")} />
        </div>
        <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-80")}>{item.label}</span>
      </Link>
    );
  };

  const walletActive = location.pathname === "/wallet";

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "rounded-t-3xl border-t border-border/40",
        "bg-card shadow-soft"
      )}
    >
      <div className="mx-auto flex max-w-lg items-end justify-around px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {leftItems.map(renderItem)}

        {/* Center wallet button */}
        <div className="relative flex flex-1 flex-col items-center">
          <Link
            to="/wallet"
            aria-label="Wallet"
            className={cn(
              "-mt-7 flex h-14 w-14 items-center justify-center rounded-full",
              "bg-primary text-primary-foreground",
              "border-4 border-background shadow-xl transition-transform duration-300 tap-pop",
              walletActive ? "ring-2 ring-primary/30" : ""
            )}
          >
            <Wallet className="h-6 w-6" strokeWidth={2.2} />
          </Link>
          <span
            className={cn(
              "mt-1 text-[10px] font-semibold",
              walletActive ? "text-primary" : "text-muted-foreground"
            )}
          >
            Wallet
          </span>
        </div>

        {rightItems.map(renderItem)}
      </div>
    </nav>
  );
}
