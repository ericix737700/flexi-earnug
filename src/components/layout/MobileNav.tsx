import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, ListTodo, Wallet, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/wallet", icon: Wallet, label: "Wallet" },
  { href: "/referrals", icon: Users, label: "Referrals" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden",
        "rounded-t-3xl border-t border-border/40",
        "bg-card/80 backdrop-blur-xl backdrop-saturate-150",
        "shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.18)]",
        "supports-[backdrop-filter]:bg-card/70"
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group relative flex flex-1 flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium tap-pop",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div
                className={cn(
                  "relative flex items-center justify-center rounded-2xl p-2 transition-all duration-300",
                  isActive
                    ? "bg-primary/15 glow-primary scale-110"
                    : "bg-transparent group-hover:bg-muted/50"
                )}
              >
                <item.icon className={cn("h-5 w-5 transition-transform", isActive && "stroke-[2.5]")} />
                {isActive && (
                  <span className="absolute -top-1 right-1 h-1.5 w-1.5 rounded-full bg-secondary animate-pulse-glow" />
                )}
              </div>
              <span className={cn("transition-opacity", isActive ? "opacity-100" : "opacity-80")}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
