import { Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";
import { LayoutDashboard, Video, Users, UserCheck, CreditCard, Cog } from "lucide-react";
import { cn } from "@/lib/utils";

const adminTabs = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Video, label: "Videos", path: "/admin/videos" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: UserCheck, label: "KYC", path: "/admin/kyc" },
  { icon: CreditCard, label: "Subs", path: "/admin/subscriptions" },
  { icon: Cog, label: "Settings", path: "/admin/settings" },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <DashboardLayout>
      <div className="w-full max-w-full overflow-x-hidden">
        {/* Admin tab bar — scrollable on mobile */}
        <div className="flex items-center gap-1 overflow-x-auto pb-px border-b border-border -mx-3 sm:-mx-4 md:-mx-8 px-3 sm:px-4 md:px-8 scrollbar-none">
          {adminTabs.map((tab) => {
            const active = tab.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px shrink-0",
                  "min-h-[48px]", // 48px touch target
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-primary/5"
                )}
              >
                <tab.icon size={18} className="shrink-0" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="w-full max-w-full overflow-x-hidden pt-4 sm:pt-6">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
};
