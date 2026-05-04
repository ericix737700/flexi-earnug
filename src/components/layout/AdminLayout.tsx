import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { PlatformLogo } from "@/components/PlatformLogo";
import {
  LayoutDashboard,
  Users,
  ListTodo,
  Wallet,
  ArrowDownToLine,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/admin/deposits", icon: ArrowDownToLine, label: "Deposits" },
  { href: "/admin/withdrawals", icon: Wallet, label: "Withdrawals" },
   { href: "/admin/notifications", icon: Bell, label: "Notifications" },
  { href: "/admin/gift-codes", icon: Gift, label: "Gift Codes" },
  { href: "/admin/settings", icon: Settings, label: "Settings" },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/admin/login");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between border-b bg-card px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <PlatformLogo size="sm" />
          <h1 className="text-lg font-bold text-primary">FlexiEarn Admin</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </header>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-sidebar text-sidebar-foreground transition-transform duration-200 md:relative md:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="hidden border-b border-sidebar-border p-4 md:flex items-center gap-2">
            <PlatformLogo size="sm" />
            <h1 className="text-xl font-bold text-sidebar-primary">
              FlexiEarn Admin
            </h1>
          </div>

          <nav className="flex-1 space-y-1 p-4 pt-16 md:pt-4">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-sidebar-border p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        <div className="p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
}
