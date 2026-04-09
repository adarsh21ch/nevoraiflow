import { Link, useLocation, useNavigate } from "react-router-dom";

import { Logo } from "@/components/landing/Logo";
import {
  LayoutDashboard, Layers, Video, Users, IndianRupee, BarChart3,
  User, Bell, Settings, LogOut, ChevronLeft, ChevronRight,
  Shield, CreditCard, Sun, Moon, Radio, FileCheck,
  FileText, Menu, Download,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/hooks/useTheme";
import {
  Sheet, SheetContent, SheetTrigger,
} from "@/components/ui/sheet";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Layers, label: "Funnels", path: "/funnels" },
  { icon: FileText, label: "Landing Pages", path: "/landing-pages" },
  { icon: Radio, label: "Live", path: "/live" },
  { icon: Video, label: "Videos", path: "/videos" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: IndianRupee, label: "Payments", path: "/payments" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const bottomItems = [
  { icon: User, label: "Profile", path: "/profile" },
  { icon: CreditCard, label: "Billing", path: "/billing" },
  { icon: FileCheck, label: "Get Verified", path: "/kyc" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: Download, label: "Install App", path: "/install" },
];


export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { isAdmin } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  const renderMobileNavItem = (item: typeof navItems[0]) => {
    const active = location.pathname.startsWith(item.path);
    const isNotif = item.path === "/notifications";
    return (
      <Link key={item.path} to={item.path} onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all relative",
          active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
        )}>
        <item.icon size={18} />
        <span>{item.label}</span>
        {isNotif && unreadCount > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Desktop sidebar */}
      <aside className={cn("hidden md:flex flex-col border-r border-border bg-sidebar transition-all duration-200 sticky top-0 h-screen", collapsed ? "w-16" : "w-60")}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-border shrink-0">
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
            <div className="pt-4 pb-2 px-3">
              <Link to="/admin" className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                location.pathname.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}>
                <Shield size={18} />
                {!collapsed && <span>Admin Panel</span>}
              </Link>
            </div>
          )}
        </nav>

        <div className="border-t border-border py-4 px-2 space-y-1 shrink-0">
          {bottomItems.map((item) => renderNavItem(item))}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full">
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile top header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
          <Logo size="sm" />
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="text-muted-foreground hover:text-foreground p-2 rounded-md">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/notifications" className="text-muted-foreground hover:text-foreground p-2 rounded-md relative">
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground p-2 rounded-md">
                  <Menu size={18} />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-0">
                <div className="p-4 border-b border-border">
                  <Logo size="sm" />
                </div>
                <nav className="py-2 px-2 space-y-0.5 overflow-y-auto max-h-[calc(100vh-160px)]">
                  <p className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Main</p>
                  {navItems.map(renderMobileNavItem)}
                  <div className="border-t border-border my-2" />
                  <p className="px-4 py-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Account</p>
                  {bottomItems.map(renderMobileNavItem)}
                  {isAdmin && (
                    <>
                      <div className="border-t border-border my-2" />
                      <Link to="/admin" onClick={() => setMobileMenuOpen(false)}
                        className={cn("flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                          location.pathname.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                        )}>
                        <Shield size={18} />
                        <span>Admin Panel</span>
                      </Link>
                    </>
                  )}
                </nav>
                <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border bg-card">
                  <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-all w-full">
                    <LogOut size={18} />
                    <span>Logout</span>
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        <div className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border flex justify-around py-1.5 z-50 safe-area-pb">
        {[
          { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
          { icon: Layers, label: "Funnels", path: "/funnels" },
          { icon: Radio, label: "Live", path: "/live" },
          { icon: Video, label: "Videos", path: "/videos" },
          { icon: User, label: "Profile", path: "/profile" },
        ].map((item) => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path}
              className={cn("flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] transition-colors min-w-0", active ? "text-primary" : "text-muted-foreground")}>
              <item.icon size={20} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

    </div>
  );
};
