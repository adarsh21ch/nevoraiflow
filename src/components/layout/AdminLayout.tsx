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
      <div className="w-full min-w-0 max-w-full overflow-x-hidden">
        <div className="w-full max-w-full overflow-x-auto border-b border-border scrollbar-none">
          <div className="flex min-w-max items-center gap-1 px-1 sm:px-4 md:px-8">
            {adminTabs.map((tab) => {
              const active = tab.path === "/admin"
                ? location.pathname === "/admin"
                : location.pathname.startsWith(tab.path);

              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    "flex min-h-[52px] shrink-0 items-center gap-2.5 whitespace-nowrap rounded-t-xl border-b-2 px-4 text-sm font-medium transition-all",
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                  )}
                >
                  <tab.icon size={20} className="shrink-0" />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="w-full min-w-0 max-w-full overflow-x-hidden pt-5 sm:pt-6">
          {children}
        </div>
      </div>
    </DashboardLayout>
  );
};
