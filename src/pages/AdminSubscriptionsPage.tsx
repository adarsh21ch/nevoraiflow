import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Search, Crown, Ban, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const failedCount = subscriptions.filter((s) => s.status === "payment_failed").length;

  const handleManualGrant = async (userId: string, planKey: string) => {
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 86400000);

    await supabase.from("user_subscriptions")
      .update({ status: "replaced" })
      .eq("user_id", userId).eq("status", "active");

    const { error } = await supabase.from("user_subscriptions").insert({
      user_id: userId, plan_key: planKey, tier: "pro", status: "active",
      billing_type: "manual", amount_paid: 0,
      started_at: now.toISOString(), expires_at: expires.toISOString(),
    });

    if (error) toast.error(error.message);
    else { toast.success("Access granted"); queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] }); }
  };

  const handleRevoke = async (subId: string) => {
    const { error } = await supabase.from("user_subscriptions")
      .update({ status: "cancelled" }).eq("id", subId);
    if (error) toast.error(error.message);
    else { toast.success("Access revoked"); queryClient.invalidateQueries({ queryKey: ["admin-all-subscriptions"] }); }
  };

  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});

  const handleSettingSave = async (key: string) => {
    const val = editingSettings[key];
    if (val === undefined) return;
    const { error } = await supabase.from("platform_settings")
      .update({ value: val }).eq("key", key);
    if (error) toast.error(error.message);
    else { toast.success("Setting updated"); queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] }); }
  };

  const getSettingValue = (key: string) => settings.find(s => s.key === key)?.value || "";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Subscriptions & Billing</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-heading font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Active Paid</p>
            <p className="text-2xl font-heading font-bold text-primary">{activeCount}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Failed Payments</p>
            <p className="text-2xl font-heading font-bold text-destructive">{failedCount}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Records</p>
            <p className="text-2xl font-heading font-bold">{subscriptions.length}</p>
          </div>
        </div>

        <Tabs defaultValue="subscriptions">
          <TabsList>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            <TabsTrigger value="settings">Pricing & Settings</TabsTrigger>
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
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-xs ${s.tier === "pro" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                              {s.plan_key}
                            </span>
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
                          <td className="p-4 space-x-2">
                            {s.status === "active" && s.tier !== "free" && (
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleRevoke(s.id)}>
                                <Ban size={12} /> Revoke
                              </Button>
                            )}
                            {(s.status !== "active" || s.tier === "free") && (
                              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleManualGrant(s.user_id, "pro_manual")}>
                                <Crown size={12} /> Grant Pro
                              </Button>
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

          <TabsContent value="audit" className="space-y-4">
            <div className="glass-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-4 text-xs text-muted-foreground font-medium">Time</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Event</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Source</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">Payment ID</th>
                      <th className="p-4 text-xs text-muted-foreground font-medium">User</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-border/50">
                        <td className="p-4 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString("en-IN")}</td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            log.event_type.includes("fail") ? "bg-destructive/10 text-destructive" :
                            log.event_type.includes("verif") ? "bg-green-500/10 text-green-600" :
                            "bg-muted text-muted-foreground"
                          }`}>{log.event_type}</span>
                        </td>
                        <td className="p-4 text-xs">{log.source}</td>
                        <td className="p-4 text-xs font-mono text-muted-foreground">{log.razorpay_payment_id || "—"}</td>
                        <td className="p-4 text-xs text-muted-foreground">
                          {log.user_id ? profileMap[log.user_id]?.email || log.user_id.slice(0, 8) : "—"}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No audit logs yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="glass-card p-6 space-y-6">
              <h3 className="font-heading font-semibold">Pricing Settings</h3>
              {[
                { key: "razorpay_monthly_price", label: "Monthly Price (₹)" },
                { key: "razorpay_onetime_price", label: "One-time/Yearly Price (₹)" },
                { key: "razorpay_onetime_validity_days", label: "One-time Validity (days)" },
                { key: "support_whatsapp", label: "Support WhatsApp Number" },
                { key: "support_message_template", label: "Support Message Template" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <label className="text-sm font-medium w-48 shrink-0">{label}</label>
                  <Input
                    className="max-w-xs"
                    defaultValue={getSettingValue(key)}
                    onChange={(e) => setEditingSettings(prev => ({ ...prev, [key]: e.target.value }))}
                  />
                  <Button size="sm" variant="outline" onClick={() => handleSettingSave(key)}>Save</Button>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminSubscriptionsPage;
