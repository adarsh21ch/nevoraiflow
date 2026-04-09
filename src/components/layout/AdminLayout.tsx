import { Link, useLocation } from "react-router-dom";
import { DashboardLayout } from "./DashboardLayout";
import { LayoutDashboard, Video, Users, UserCheck, CreditCard, Cog } from "lucide-react";
import { cn } from "@/lib/utils";

const adminTabs = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Video, label: "Videos", path: "/admin/videos" },
  { icon: Users, label: "Users", path: "/admin/users" },
  { icon: UserCheck, label: "KYC", path: "/admin/kyc" },
  { icon: CreditCard, label: "Subscriptions", path: "/admin/subscriptions" },
  { icon: Cog, label: "Settings", path: "/admin/settings" },
];

export const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Admin horizontal nav */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border -mx-4 md:-mx-8 px-4 md:px-8">
          {adminTabs.map((tab) => {
            const active = tab.path === "/admin"
              ? location.pathname === "/admin"
              : location.pathname.startsWith(tab.path);
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-[1px]",
                  active
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon size={16} />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>

        {children}
      </div>
    </DashboardLayout>
  );
};
