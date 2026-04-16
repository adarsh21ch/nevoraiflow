import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect, useCallback } from "react";
import { Save, Star, Mail, CheckCircle2, XCircle, Loader2 } from "lucide-react";

const AdminSettingsPage = () => {
  const queryClient = useQueryClient();

  const { data: settings = [] } = useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("platform_settings").select("*");
      return data || [];
    },
  });

  const getVal = (key: string) => settings.find((s) => s.key === key)?.value || "";

  const [announcementText, setAnnouncementText] = useState("");
  const [announcementActive, setAnnouncementActive] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxVideoSeconds, setMaxVideoSeconds] = useState("60");
  const [maxPerPage, setMaxPerPage] = useState("8");
  const [videoFeatureEnabled, setVideoFeatureEnabled] = useState(true);

  useEffect(() => {
    if (settings.length) {
      setAnnouncementText(getVal("announcement_text"));
      setAnnouncementActive(getVal("announcement_active") === "true");
      setMaintenanceMode(getVal("maintenance_mode") === "true");
      setMaxVideoSeconds(getVal("testimonial_max_video_seconds") || "60");
      setMaxPerPage(getVal("testimonial_max_per_page") || "8");
      setVideoFeatureEnabled(getVal("testimonial_video_feature_enabled") !== "false");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: "announcement_text", value: announcementText },
        { key: "announcement_active", value: String(announcementActive) },
        { key: "maintenance_mode", value: String(maintenanceMode) },
        { key: "testimonial_max_video_seconds", value: maxVideoSeconds },
        { key: "testimonial_max_per_page", value: maxPerPage },
        { key: "testimonial_video_feature_enabled", value: String(videoFeatureEnabled) },
      ];
      for (const u of updates) {
        await supabase.from("platform_settings").update({ value: u.value }).eq("key", u.key);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-platform-settings"] });
      toast.success("Settings saved");
    },
  });

  const { data: gmailConnected, refetch: refetchGmail } = useQuery({
    queryKey: ["gmail-connection-status"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.functions.invoke("send-gmail-email", { method: "GET" });
        if (error) throw error;
        return { connected: Boolean(data?.connected), email: data?.email ?? null };
      } catch {
        return { connected: false, email: null };
      }
    },
    staleTime: 30_000,
  });

  const [connectingGmail, setConnectingGmail] = useState(false);

  const handleConnectGmail = useCallback(async () => {
    setConnectingGmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("gmail-oauth-init", { body: {} });
      if (error || !data?.auth_url) {
        toast.error(data?.error || "Failed to start Gmail connection");
        setConnectingGmail(false);
        return;
      }
      const popup = window.open(data.auth_url, "gmail-oauth", "width=600,height=700,scrollbars=yes");
      const interval = setInterval(() => {
        if (popup?.closed) {
          clearInterval(interval);
          setConnectingGmail(false);
          refetchGmail();
          toast.success("Gmail connection updated. Refreshing status...");
        }
      }, 1000);
      setTimeout(() => { clearInterval(interval); setConnectingGmail(false); }, 5 * 60 * 1000);
    } catch {
      toast.error("Failed to connect Gmail");
      setConnectingGmail(false);
    }
  }, [refetchGmail]);

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      toast.info("To disconnect, revoke access at myaccount.google.com/permissions");
    },
    onSuccess: () => { refetchGmail(); },
  });

  return (
    <AdminLayout>
      <div className="w-full max-w-full sm:max-w-2xl space-y-5 overflow-x-hidden">
        <h1 className="text-xl sm:text-2xl font-heading font-bold">Platform Settings</h1>

        {/* Gmail Connection */}
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <h2 className="text-base font-heading font-semibold flex items-center gap-2">
            <Mail size={18} className="text-primary" /> Gmail Email Connection
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Connect your Gmail account to send confirmation emails to users. Supports up to 2,000 emails/day with Google Workspace.
          </p>

          <div className="flex items-center gap-3">
            {gmailConnected?.connected ? (
              <>
                <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                <span className="text-sm text-foreground truncate">
                  Gmail Connected{gmailConnected?.email ? ` (${gmailConnected.email})` : ""}
                </span>
              </>
            ) : (
              <>
                <XCircle size={18} className="text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground">Gmail not connected</span>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={gmailConnected?.connected ? "outline" : "hero"}
              size="sm"
              className="min-h-[40px]"
              onClick={handleConnectGmail}
              disabled={connectingGmail}
            >
              {connectingGmail ? (
                <><Loader2 size={14} className="animate-spin" /> Connecting...</>
              ) : gmailConnected?.connected ? "Reconnect Gmail" : "Connect Gmail"}
            </Button>
            {gmailConnected?.connected && (
              <Button variant="ghost" size="sm" className="min-h-[40px]" onClick={() => disconnectMutation.mutate()}>
                Disconnect
              </Button>
            )}
          </div>

          <div className="text-[11px] text-muted-foreground">
            <p className="mb-1">Redirect URI for Google Console:</p>
            <code className="text-xs bg-muted px-2 py-1 rounded block break-all">
              {`https://atwnmovdnblcqyvhaxls.supabase.co/functions/v1/gmail-oauth-callback`}
            </code>
          </div>
        </div>

        {/* Announcement & Maintenance */}
        <div className="glass-card p-4 sm:p-6 space-y-6">
          <div>
            <h2 className="text-base font-heading font-semibold mb-4">Announcement Banner</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between min-h-[44px]">
                <Label>Show Announcement</Label>
                <Switch checked={announcementActive} onCheckedChange={setAnnouncementActive} />
              </div>
              <div>
                <Label>Announcement Text</Label>
                <Textarea value={announcementText} onChange={(e) => setAnnouncementText(e.target.value)} className="mt-1.5 bg-muted border-border" placeholder="Write your announcement..." rows={3} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6">
            <h2 className="text-base font-heading font-semibold mb-4">Maintenance Mode</h2>
            <div className="flex items-center justify-between gap-4 min-h-[44px]">
              <div className="flex-1 min-w-0">
                <Label>Enable Maintenance Mode</Label>
                <p className="text-xs text-muted-foreground mt-1">When enabled, users will see a maintenance page.</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
          </div>

          {/* Testimonials Settings */}
          <div className="border-t border-border pt-6">
            <h2 className="text-base font-heading font-semibold mb-4 flex items-center gap-2">
              <Star size={18} className="text-primary" /> Testimonials
            </h2>
            <div className="space-y-4">
              <div>
                <Label>Maximum video testimonial duration</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum length allowed for each testimonial video</p>
                <Select value={maxVideoSeconds} onValueChange={setMaxVideoSeconds}>
                  <SelectTrigger className="mt-1.5 bg-muted border-border w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="45">45 seconds</SelectItem>
                    <SelectItem value="60">60 seconds</SelectItem>
                    <SelectItem value="90">90 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Maximum testimonials per landing page</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum testimonials a creator can add per landing page</p>
                <Input type="number" min={1} max={20} value={maxPerPage} onChange={(e) => setMaxPerPage(e.target.value)} className="mt-1.5 bg-muted border-border w-full sm:w-32" />
              </div>

              <div className="flex items-center justify-between gap-4 min-h-[44px]">
                <div className="flex-1 min-w-0">
                  <Label>Allow video testimonials on landing pages</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">If disabled, only text testimonials will be available</p>
                </div>
                <Switch checked={videoFeatureEnabled} onCheckedChange={setVideoFeatureEnabled} />
              </div>
            </div>
          </div>
        </div>

        <Button variant="hero" className="w-full sm:w-auto min-h-[48px]" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save size={18} /> {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;
