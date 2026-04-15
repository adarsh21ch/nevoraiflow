import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Crown, ArrowRight, Lock, Check } from "lucide-react";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { usePlan } from "@/hooks/usePlan";
import { format } from "date-fns";

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { plan } = usePlan();
  const { isFree, config, counts, tier, canUseMultilevel } = usePlanLimits();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", city: "", bio: "", company: "",
    instagram_url: "", whatsapp_number: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "", phone: profile.phone || "", city: profile.city || "",
        bio: profile.bio || "", company: profile.company || "",
        instagram_url: profile.instagram_url || "", whatsapp_number: profile.whatsapp_number || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setLoading(false);
    if (error) { toast.error("Failed to save"); return; }
    await refreshProfile();
    toast.success("Profile updated!");
  };

  const usageBar = (label: string, current: number, max: number) => {
    const pct = max === -1 ? 0 : Math.min((current / max) * 100, 100);
    const isHigh = max !== -1 && pct >= 90;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-medium ${isHigh ? "text-destructive" : ""}`}>
            {current} / {max === -1 ? "∞" : max} used
          </span>
        </div>
        {max !== -1 && (
          <Progress value={pct} className={`h-2 ${isHigh ? "[&>div]:bg-destructive" : "[&>div]:bg-primary"}`} />
        )}
      </div>
    );
  };

  const tierBadge = isFree
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Free</span>
    : tier === "basic"
    ? <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium">Basic</span>
    : <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium">Pro</span>;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">Profile</h1>

        {/* Plan Status Card */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Crown size={20} className="text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold capitalize">{tier} Plan</h3>
                  {tierBadge}
                </div>
                {!isFree && plan.billingType && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {plan.billingType} · {plan.expiresAt ? `Renews ${format(new Date(plan.expiresAt), "d MMM yyyy")}` : "Active"}
                  </p>
                )}
                {isFree && (
                  <p className="text-xs text-muted-foreground">View only. Subscribe to start creating.</p>
                )}
              </div>
            </div>
          </div>

          {!isFree && (
            <div className="space-y-3 pt-2 border-t border-border">
              {usageBar("Funnels", counts.funnels, config.max_funnels)}
              {usageBar("Landing Pages", counts.landing_pages, config.max_landing_pages)}
              {usageBar("Live Sessions", counts.live_sessions, config.max_live_sessions)}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Multi-level Funnels</span>
                {canUseMultilevel ? (
                  <span className="flex items-center gap-1 text-green-600"><Check size={12} /> Enabled</span>
                ) : (
                  <span className="flex items-center gap-1 text-muted-foreground"><Lock size={12} /> Locked</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {(isFree || plan.isExpired || plan.isExpiringSoon || tier === "basic") && (
              <Link to="/pricing">
                <Button size="sm" className="gap-1.5">
                  {plan.isExpired ? "Renew" : isFree ? "Upgrade" : "Upgrade to Pro"} <ArrowRight size={14} />
                </Button>
              </Link>
            )}
            <Link to="/billing">
              <Button size="sm" variant="outline">Manage Billing</Button>
            </Link>
          </div>
        </div>

        {/* Profile form */}
        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">{profile?.full_name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>WhatsApp Number</Label><Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>Instagram URL</Label><Input value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="mt-1 bg-muted border-border" /></div>
          </div>
          <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 160) })} className="mt-1 bg-muted border-border" rows={3} maxLength={160} /><span className="text-xs text-muted-foreground">{form.bio.length}/160</span></div>

          <Button variant="hero" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
