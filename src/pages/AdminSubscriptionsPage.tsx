import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";
import { Search, Crown, Ban, CheckCircle2, XCircle, Save, Target, BarChart3, MessageSquare, Video, FileText, Users, TrendingUp, Shield, Zap } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { PlanConfig } from "@/hooks/usePlanLimits";

// Extracted PlanField to prevent focus loss on parent re-render
const PlanField = ({ planName, field, label, type = "number", disabled = false, hint, value: initialValue, onSave }: {
  planName: string; field: string; label: string; type?: string; disabled?: boolean; hint?: string;
  value: any; onSave: (planName: string, field: string, value: any) => Promise<void>;
}) => {
  const [localValue, setLocalValue] = useState<string>(String(initialValue ?? ""));
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isDirty) {
      setLocalValue(String(initialValue ?? ""));
    }
  }, [initialValue, isDirty]);

  const handleSave = async () => {
    setSaving(true);
    const parsed = type === "text" ? localValue : (localValue === "" ? null : parseInt(localValue));
    await onSave(planName, field, parsed);
    setIsDirty(false);
    setSaving(false);
  };

  if (type === "boolean") {
    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1">
          <Label className="text-xs font-medium">{label}</Label>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
        <Switch
          checked={!!initialValue}
          disabled={disabled}
          onCheckedChange={(v) => onSave(planName, field, v)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1">
        <Label className="text-xs font-medium">{label}</Label>
        {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          ref={inputRef}
          type={type === "text" ? "text" : "number"}
          value={localValue}
          disabled={disabled}
          className="w-28 h-8 text-sm"
          placeholder={type === "text" ? "" : "-1 = ∞"}
          onChange={(e) => {
            setLocalValue(e.target.value);
            setIsDirty(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
        {isDirty && (
          <Button
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={handleSave}
            disabled={saving}
          >
            <Save size={12} /> Save
          </Button>
        )}
      </div>
    </div>
  );
};

const FEATURE_TOGGLES = [
  { field: "feature_lead_capture", label: "Lead Capture", desc: "Collect leads via funnel forms", icon: Target },
  { field: "feature_analytics", label: "Analytics", desc: "View funnel performance analytics", icon: BarChart3 },
  { field: "feature_whatsapp_automation", label: "WhatsApp Automation", desc: "Send automated WhatsApp messages", icon: MessageSquare },
  { field: "feature_go_live", label: "Go Live", desc: "Host live sessions", icon: Video },
  { field: "feature_landing_pages", label: "Landing Pages", desc: "Create standalone landing pages", icon: FileText },
  { field: "feature_video_sharing", label: "Video Sharing", desc: "Share videos with prospects", icon: Video },
  { field: "multilevel_funnel_enabled", label: "Multi-level Funnels", desc: "Create step-by-step video funnel sequences", icon: TrendingUp },
  { field: "feature_team_analytics", label: "Team Analytics", desc: "View analytics for your entire team", icon: Users },
  { field: "feature_advanced_analytics", label: "Advanced Analytics", desc: "Detailed conversion and engagement data", icon: Zap },
  { field: "feature_priority_support", label: "Priority Support", desc: "Priority WhatsApp/email support", icon: Shield },
];

const AdminSubscriptionsPage = () => {
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["admin-all-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      return data || [];
    },
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_audit_logs").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const { data: planConfigs = [] } = useQuery({
    queryKey: ["admin-plan-configs"],
    queryFn: async () => {
      const { data } = await supabase.from("plan_config").select("*");
      return (data || []) as any[];
    },
  });

  const { data: settings = [] } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      return data || [];
    },
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const filtered = subscriptions.filter((s) => {
    if (!search) return true;
    const profile = profileMap[s.user_id];
    return profile?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      profile?.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.plan_key.toLowerCase().includes(search.toLowerCase());
  });

  const totalRevenue = subscriptions.reduce((a, s) => a + (s.amount_paid || 0), 0);
  const activeCount = subscriptions.filter((s) => s.status === "active" && s.tier !== "free").length;
  const basicCount = subscriptions.filter((s) => s.status === "active" && s.tier === "basic").length;
  const proCount = subscriptions.filter((s) => s.status === "active" && s.tier === "pro").length;
  const failedCount = subscriptions.filter((s) => s.status === "payment_failed").length;

  const handleManualGrant = async (userId: string, tier: string) => {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);
    await supabase.from("user_subscriptions").update({ status: "replaced" }).eq("user_id", userId).eq("status", "active");
    const planKey = tier === "basic" ? "basic_monthly" : "pro_monthly";
    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: userId, plan_key: planKey, tier, status: "active",
      billing_type: "manual", amount_paid: 0,
      started_at: now.toISOString(), expires_at: expires.toISOString(),
    });
    if (error) toast.error(error.message);
    else { toast.success(`${tier} access granted`); queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] }); }
  };

  const handleRevoke = async (subId: string) => {
    const { error } = await supabase.from("user_subscriptions").update({ status: "cancelled" }).eq("id", subId);
    if (error) toast.error(error.message);
    else { toast.success("Access revoked"); queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] }); }
  };

  const saveField = useCallback(async (planName: string, field: string, value: any) => {
    const updateObj: Record<string, any> = { [field]: value, updated_at: new Date().toISOString() };
    const { error } = await supabase
      .from("plan_config")
      .update(updateObj as any)
      .eq("plan_name", planName);
    if (error) {
      toast.error("Failed to save");
    } else {
      toast.success("Updated!");
      queryClient.invalidateQueries({ queryKey: ["admin-plan-configs"] });
      queryClient.invalidateQueries({ queryKey: ["plan-configs"] });
    }
  }, [queryClient]);

  const handleTogglePlan = async (planName: string, enabled: boolean) => {
    const { error } = await supabase
      .from("plan_config")
      .update({ is_enabled: enabled, updated_at: new Date().toISOString() } as any)
      .eq("plan_name", planName);
    if (error) toast.error("Failed to update");
    else {
      toast.success(`${planName.charAt(0).toUpperCase() + planName.slice(1)} plan ${enabled ? "enabled" : "disabled"}`);
      queryClient.invalidateQueries({ queryKey: ["admin-plan-configs"] });
      queryClient.invalidateQueries({ queryKey: ["plan-configs"] });
    }
  };

  const basicConfig = planConfigs.find(c => c.plan_name === "basic") as any;
  const proConfig = planConfigs.find(c => c.plan_name === "pro") as any;

  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});

  const handleSettingSave = async (key: string) => {
    const val = editingSettings[key];
    if (val === undefined) return;
    const { error } = await supabase.from("platform_settings").update({ value: val }).eq("key", key);
    if (error) toast.error(error.message);
    else { toast.success("Setting updated"); queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] }); }
  };

  const getSettingValue = (key: string) => settings.find(s => s.key === key)?.value || "";

  const renderPlanCard = (planName: string, config: any, colorClass: string, badgeClass: string) => {
    const isDisabled = config?.is_enabled === false;
    const isBasic = planName === "basic";

    return (
      <div className={`glass-card p-6 space-y-4 transition-opacity ${isDisabled ? "opacity-50" : ""} ${!isBasic ? "border-primary/30" : ""}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}>
              {planName.charAt(0).toUpperCase() + planName.slice(1)}
            </span>
            <span className="text-xs text-muted-foreground">
              {isBasic ? "For Individuals" : "For Teams"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">
              {!isDisabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              checked={!isDisabled}
              onCheckedChange={(v) => handleTogglePlan(planName, v)}
            />
          </div>
        </div>

        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="pricing" className="text-xs">Pricing</TabsTrigger>
            <TabsTrigger value="limits" className="text-xs">Limits</TabsTrigger>
            <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="pt-3 space-y-1">
            <PlanField planName={planName} field="monthly_price" label="Monthly Price (₹)" value={config?.monthly_price} onSave={saveField} disabled={isDisabled} />
            <PlanField planName={planName} field="yearly_price" label="Yearly Price (₹)" value={config?.yearly_price} onSave={saveField} disabled={isDisabled} />
            <PlanField planName={planName} field="yearly_validity_days" label="Yearly Validity (days)" value={config?.yearly_validity_days} onSave={saveField} disabled={isDisabled} />
            <PlanField planName={planName} field="plan_badge_text" label="Plan Badge Text" type="text" value={config?.plan_badge_text || ""} onSave={saveField} disabled={isDisabled} hint="Shown above plan card on pricing page" />
          </TabsContent>

          <TabsContent value="limits" className="pt-3 space-y-1">
            <PlanField planName={planName} field="max_funnels" label="Max Funnels" hint="-1 = unlimited" value={config?.max_funnels} onSave={saveField} disabled={isDisabled} />
            <PlanField planName={planName} field="max_landing_pages" label="Max Landing Pages" hint="-1 = unlimited" value={config?.max_landing_pages} onSave={saveField} disabled={isDisabled} />
            <PlanField planName={planName} field="max_live_sessions" label="Max Live Sessions" hint="-1 = unlimited" value={config?.max_live_sessions} onSave={saveField} disabled={isDisabled} />
            <PlanField
              planName={planName}
              field="max_team_members"
              label="Max Team Members"
              hint={isBasic ? "N/A — Basic plan has no team" : "-1 = unlimited"}
              value={isBasic ? 0 : config?.max_team_members}
              onSave={saveField}
              disabled={isDisabled || isBasic}
            />
          </TabsContent>

          <TabsContent value="features" className="pt-3 space-y-0.5">
            {FEATURE_TOGGLES.map(({ field, label, desc, icon: Icon }) => {
              // Hide team-related toggles for basic
              if (isBasic && (field === "feature_team_analytics")) return null;
              return (
                <div key={field} className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
                  <Icon size={14} className="text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{desc}</p>
                  </div>
                  <Switch
                    checked={!!config?.[field]}
                    disabled={isDisabled}
                    onCheckedChange={(v) => saveField(planName, field, v)}
                  />
                </div>
              );
            })}
          </TabsContent>
        </Tabs>

        {isDisabled && (
          <p className="text-xs text-amber-500 bg-amber-500/10 rounded-lg p-3">
            ⚠️ {planName.charAt(0).toUpperCase() + planName.slice(1)} plan is disabled. It won't appear on the pricing page.
          </p>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Subscriptions & Billing</h1>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-heading font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Active Paid</p>
            <p className="text-2xl font-heading font-bold text-primary">{activeCount}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Basic</p>
            <p className="text-2xl font-heading font-bold text-blue-600">{basicCount}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Pro</p>
            <p className="text-2xl font-heading font-bold text-green-600">{proCount}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Failed</p>
            <p className="text-2xl font-heading font-bold text-destructive">{failedCount}</p>
          </div>
        </div>

        <Tabs defaultValue="subscriptions">
          <TabsList>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="plans">Plans & Limits</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-4">
            <div className="relative max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search user, plan..." className="pl-9 bg-muted border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-4 text-xs text-muted-foreground font-medium">User</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Plan</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Tier</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Status</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Amount</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Expires</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((s) => {
                      const profile = profileMap[s.user_id];
                      return (
                        <tr key={s.id} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4">
                            <p className="font-medium">{profile?.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{profile?.email}</p>
                          </td>
                          <td className="p-4 text-xs">{s.plan_key}</td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                              s.tier === "pro" ? "bg-green-500/10 text-green-600" :
                              s.tier === "basic" ? "bg-blue-500/10 text-blue-600" :
                              "bg-muted text-muted-foreground"
                            }`}>{s.tier}</span>
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs inline-flex items-center gap-1 ${
                              s.status === "active" ? "bg-green-500/10 text-green-600" :
                              s.status === "payment_failed" ? "bg-destructive/10 text-destructive" :
                              "bg-muted text-muted-foreground"
                            }`}>
                              {s.status === "active" ? <CheckCircle2 size={10} /> : s.status === "payment_failed" ? <XCircle size={10} /> : null}
                              {s.status}
                            </span>
                          </td>
                          <td className="p-4">₹{(s.amount_paid || 0).toLocaleString("en-IN")}</td>
                          <td className="p-4 text-xs text-muted-foreground">
                            {s.expires_at ? new Date(s.expires_at).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td className="p-4 space-x-1">
                            {s.status === "active" && s.tier !== "free" && (
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleRevoke(s.id)}>
                                <Ban size={12} /> Revoke
                              </Button>
                            )}
                            {(s.status !== "active" || s.tier === "free") && (
                              <div className="flex gap-1">
                                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleManualGrant(s.user_id, "basic")}>
                                  Grant Basic
                                </Button>
                                <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleManualGrant(s.user_id, "pro")}>
                                  <Crown size={12} /> Grant Pro
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="plans" className="space-y-4">
            <p className="text-sm text-muted-foreground">Edit pricing, limits, and features for each plan. Changes apply immediately to the pricing page.</p>
            <div className="grid md:grid-cols-2 gap-6">
              {renderPlanCard("basic", basicConfig, "blue", "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400")}
              {renderPlanCard("pro", proConfig, "green", "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400")}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-4 text-xs text-muted-foreground font-medium">User</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Event</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Source</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Razorpay ID</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => {
                      const profile = profileMap[log.user_id || ""];
                      return (
                        <tr key={log.id} className="border-b border-border/50">
                          <td className="p-4 text-xs">{profile?.full_name || log.user_id || "—"}</td>
                          <td className="p-4 text-xs">{log.event_type}</td>
                          <td className="p-4 text-xs">{log.source}</td>
                          <td className="p-4 text-xs font-mono">{log.razorpay_payment_id || log.razorpay_order_id || "—"}</td>
                          <td className="p-4 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("en-IN")}</td>
                        </tr>
                      );
                    })}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No audit logs yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="glass-card p-6 space-y-4 max-w-lg">
              <h3 className="font-heading font-semibold">Platform Settings</h3>
              {["razorpay_key_id", "maintenance_mode", "whatsapp_support_number"].map(key => (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs font-medium capitalize">{key.replace(/_/g, " ")}</Label>
                    <Input
                      className="mt-1 h-8 text-sm"
                      value={editingSettings[key] ?? getSettingValue(key)}
                      onChange={e => setEditingSettings(prev => ({ ...prev, [key]: e.target.value }))}
                    />
                  </div>
                  <Button size="sm" className="h-8 mt-5" onClick={() => handleSettingSave(key)}>
                    <Save size={12} />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSubscriptionsPage;
