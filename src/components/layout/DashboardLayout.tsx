import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "@/components/landing/Logo";
import {
  LayoutDashboard, Layers, Video, Users, IndianRupee, BarChart3,
  User, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, Cog, UserCheck, CreditCard, Sun, Moon,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Layers, label: "Funnels", path: "/funnels" },
  { icon: Video, label: "Videos", path: "/videos" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: IndianRupee, label: "Payments", path: "/payments" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const bottomItems = [
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const adminItems = [
  { icon: Shield, label: "Admin", path: "/admin" },
  { icon: Video, label: "Videos", path: "/admin/videos" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: UserCheck, label: "KYC", path: "/admin/kyc" },
  { icon: CreditCard, label: "Subs", path: "/admin/subscriptions" },
  { icon: Cog, label: "Settings", path: "/admin/settings" },
];

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user!.id).eq("is_read", false);
      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const renderNavItem = (item: typeof navItems[0], matchExact = false) => {
    const active = matchExact ? location.pathname === item.path : location.pathname.startsWith(item.path);
    const isNotif = item.path === "/notifications";
    return (
      <Link key={item.path} to={item.path}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative",
          active ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )}>
        <item.icon size={18} />
        {!collapsed && <span>{item.label}</span>}
        {isNotif && unreadCount > 0 && (
          <span className={cn("bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center", collapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto w-5 h-5")}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex">
      <aside className={cn("hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200", collapsed ? "w-16" : "w-60")}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-border">
          {!collapsed && <Logo size="sm" />}
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors" title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => setCollapsed(!collapsed)} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition-colors">
              {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>
        </div>

        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => renderNavItem(item))}

          {isAdmin && (
            <>
              <div className="pt-4 pb-2 px-3">
                {!collapsed && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Admin</span>}
                {collapsed && <div className="border-t border-border" />}
              </div>
              {adminItems.map((item) => renderNavItem(item, true))}
            </>
          )}
        </nav>

        <div className="border-t border-border py-4 px-2 space-y-1">
          {bottomItems.map((item) => renderNavItem(item))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass-card border-t border-white/[0.06] flex justify-around py-2 z-50">
        {[navItems[0], navItems[1], navItems[2], navItems[3], bottomItems[0]].map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={cn("flex flex-col items-center gap-1 px-3 py-1.5 text-xs transition-colors", active ? "text-primary" : "text-muted-foreground")}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
