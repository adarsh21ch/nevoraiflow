import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { useTheme } from "@/hooks/useTheme";
import { useNavigate, Link } from "react-router-dom";
import { Shield, CreditCard, LogOut, Sun, Moon, Download, Trash2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

const SettingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const { subscription, tier } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("user-data-controls", { body: { action: "export" } });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nflow-data-${user?.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded.");
    } catch (e) {
      console.error(e);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    setDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("user-data-controls", { body: { action: "delete", confirm: "DELETE" } });
      if (error) throw error;
      toast.success("Account deleted.");
      await signOut();
      navigate("/");
    } catch (e) {
      console.error(e);
      toast.error("Delete failed. Please contact support.");
      setDeleting(false);
    }
  };

  const { subscription, tier } = useSubscription();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Settings</h1>
          <div className="page-header-accent" />
        </div>

        <div className="premium-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="stat-icon">
              {theme === "dark" ? <Moon size={18} className="text-primary" /> : <Sun size={18} className="text-primary" />}
            </div>
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-muted-foreground">{theme === "dark" ? "Dark mode" : "Light mode"}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? <><Sun size={14} className="mr-1.5" /> Light</> : <><Moon size={14} className="mr-1.5" /> Dark</>}
          </Button>
        </div>

        <div className="premium-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="stat-icon">
              <CreditCard size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Current Plan: <span className="text-primary capitalize">{tier}</span></p>
              <p className="text-xs text-muted-foreground">{subscription?.plan_key || "free"}</p>
            </div>
          </div>
          <Link to="/pricing"><Button variant="outline" size="sm">Upgrade</Button></Link>
        </div>

        <div className="premium-card p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="stat-icon">
              <Shield size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">KYC Status: <span className="capitalize">{profile?.kyc_status || "none"}</span></p>
            </div>
          </div>
          <Link to="/kyc"><Button variant="outline" size="sm">Manage</Button></Link>
        </div>

        <div className="premium-card p-5">
          <Button variant="destructive" className="w-full" onClick={async () => { await signOut(); navigate("/"); }}>
            <LogOut size={16} /> Sign Out
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
