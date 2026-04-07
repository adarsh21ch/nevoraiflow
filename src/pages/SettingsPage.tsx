import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate, Link } from "react-router-dom";
import { Shield, CreditCard, LogOut, Sun, Moon } from "lucide-react";

const SettingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const { subscription, tier } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">Settings</h1>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === "dark" ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? <><Sun size={14} className="mr-1.5" /> Light</> : <><Moon size={14} className="mr-1.5" /> Dark</>}
          </Button>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard size={18} className="text-primary" />
            <div>
              <p className="text-sm font-medium">Current Plan: <span className="text-primary capitalize">{tier}</span></p>
              <p className="text-xs text-muted-foreground">{subscription?.plan_key || "free"}</p>
            </div>
          </div>
          <Link to="/pricing"><Button variant="outline" size="sm">Upgrade</Button></Link>
        </div>

        <div className="glass-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={18} className="text-primary" />
            <div>
              <p className="text-sm font-medium">KYC Status: <span className="capitalize">{profile?.kyc_status || "none"}</span></p>
            </div>
          </div>
          <Link to="/kyc"><Button variant="outline" size="sm">Manage</Button></Link>
        </div>

        <div className="glass-card p-5">
          <Button variant="destructive" className="w-full" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
