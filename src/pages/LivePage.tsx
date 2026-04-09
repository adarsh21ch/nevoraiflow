import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Radio, Plus, Calendar, Users, Clock, ExternalLink, Eye, Copy,
  Pencil, Trash2, Video, Lock, Globe, IndianRupee, X
} from "lucide-react";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/UpgradeModal";

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "my-session";

const statusBadge = (status: string, scheduledAt: string | null) => {
  const cls: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-500/10 text-blue-500",
    live: "bg-emerald-500/10 text-emerald-500",
    ended: "bg-muted text-muted-foreground",
    cancelled: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls[status] || cls.draft}`}>
      {status === "scheduled" && scheduledAt && isFuture(new Date(scheduledAt))
        ? `In ${formatDistanceToNow(new Date(scheduledAt))}`
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const accessIcon = (type: string) => {
  if (type === "lead_gated") return <Users size={13} />;
  if (type === "paid") return <IndianRupee size={13} />;
  return <Globe size={13} />;
};

const LivePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"upgrade" | "limit">("upgrade");
  const { isFree, canCreateLive, config, counts, tier } = usePlanLimits();

  // New session form
  const [form, setForm] = useState({
    title: "", description: "", session_type: "zoom" as string,
    meeting_url: "", scheduled_at: "", duration_minutes: 60,
    access_type: "public" as string, max_attendees: null as number | null,
    lead_form_enabled: true, show_name: true, show_phone: true, show_email: true, show_city: false,
    payment_amount: 0, upi_id: "", qr_code_url: "", payment_instructions: "",
    replay_enabled: false, replay_url: "",
  });

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["live-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_sessions")
        .select("*")
        .eq("owner_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = generateSlug(form.title) + "-" + Date.now().toString(36);
      const { error } = await supabase.from("live_sessions").insert({
        owner_id: user!.id,
        title: form.title,
        description: form.description || null,
        slug,
        session_type: form.session_type,
        meeting_url: form.meeting_url || null,
        scheduled_at: form.scheduled_at || null,
        duration_minutes: form.duration_minutes,
        access_type: form.access_type,
        max_attendees: form.max_attendees,
        lead_form_enabled: form.lead_form_enabled,
        show_name: form.show_name,
        show_phone: form.show_phone,
        show_email: form.show_email,
        show_city: form.show_city,
        payment_amount: form.access_type === "paid" ? form.payment_amount : 0,
        upi_id: form.access_type === "paid" ? form.upi_id : null,
        qr_code_url: form.access_type === "paid" ? form.qr_code_url : null,
        payment_instructions: form.access_type === "paid" ? form.payment_instructions : null,
        replay_enabled: form.replay_enabled,
        replay_url: form.replay_url || null,
        status: form.scheduled_at ? "scheduled" : "draft",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Live session created!");
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
      setCreating(false);
      setForm({
        title: "", description: "", session_type: "zoom", meeting_url: "",
        scheduled_at: "", duration_minutes: 60, access_type: "public",
        max_attendees: null, lead_form_enabled: true, show_name: true,
        show_phone: true, show_email: true, show_city: false,
        payment_amount: 0, upi_id: "", qr_code_url: "", payment_instructions: "",
        replay_enabled: false, replay_url: "",
      });
    },
    onError: () => toast.error("Failed to create session"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("live_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session deleted");
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("live_sessions").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
      toast.success("Status updated");
    },
  });

  const upd = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-heading font-bold">Live</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Create live sessions, collect registrations, and share meeting links with your audience.
              </p>
            </div>
            {!isFree && config.max_live_sessions !== -1 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${counts.live_sessions >= config.max_live_sessions ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                {counts.live_sessions}/{config.max_live_sessions}
              </span>
            )}
          </div>
          <Button variant="hero" onClick={() => {
            if (isFree) {
              setModalType("upgrade");
              setModalOpen(true);
              return;
            }
            if (!canCreateLive) {
              setModalType("limit");
              setModalOpen(true);
              return;
            }
            setCreating(true);
          }}>
            <Plus size={16} /> New Session
          </Button>
        </div>

        {/* Create modal */}
        {creating && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="glass-card w-full max-w-xl p-6 space-y-5 relative">
              <button onClick={() => setCreating(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
              <h2 className="text-lg font-heading font-bold">Create Live Session</h2>

              {/* Title */}
              <div>
                <Label className="text-sm font-medium">Session Title *</Label>
                <Input value={form.title} onChange={(e) => upd("title", e.target.value)} placeholder="e.g. Weekly Training Call" className="mt-1 bg-muted border-border" />
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <Textarea value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="What this session is about..." className="mt-1 bg-muted border-border" rows={2} maxLength={300} />
              </div>

              {/* Session Type & URL */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Platform</Label>
                  <Select value={form.session_type} onValueChange={(v) => upd("session_type", v)}>
                    <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="google_meet">Google Meet</SelectItem>
                      <SelectItem value="custom">Custom Link</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Meeting URL</Label>
                  <Input value={form.meeting_url} onChange={(e) => upd("meeting_url", e.target.value)} placeholder="https://zoom.us/j/..." className="mt-1 bg-muted border-border" />
                </div>
              </div>

              {/* Schedule & Duration */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm font-medium">Schedule Date & Time</Label>
                  <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => upd("scheduled_at", e.target.value)} className="mt-1 bg-muted border-border" />
                </div>
                <div>
                  <Label className="text-sm font-medium">Duration (mins)</Label>
                  <Input type="number" value={form.duration_minutes} onChange={(e) => upd("duration_minutes", parseInt(e.target.value) || 60)} className="mt-1 bg-muted border-border" min={5} />
                </div>
              </div>

              {/* Access Type */}
              <div>
                <Label className="text-sm font-medium">Access Type</Label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {[
                    { val: "public", label: "Public", icon: Globe, desc: "Anyone can join" },
                    { val: "lead_gated", label: "Registration", icon: Users, desc: "Collect info first" },
                    { val: "paid", label: "Paid", icon: IndianRupee, desc: "Payment required" },
                  ].map((opt) => (
                    <button key={opt.val} onClick={() => upd("access_type", opt.val)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                        form.access_type === opt.val ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-muted-foreground/40"
                      }`}
                    >
                      <opt.icon size={18} />
                      <span className="text-xs font-semibold">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Registration Form Config */}
              {(form.access_type === "lead_gated" || form.access_type === "paid") && (
                <div className="space-y-2 p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registration Form</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "show_name", label: "Name" },
                      { key: "show_phone", label: "Phone" },
                      { key: "show_email", label: "Email" },
                      { key: "show_city", label: "City" },
                    ].map((f) => (
                      <div key={f.key} className="flex items-center justify-between">
                        <Label className="text-xs">{f.label}</Label>
                        <Switch checked={(form as any)[f.key]} onCheckedChange={(v) => upd(f.key, v)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Config */}
              {form.access_type === "paid" && (
                <div className="space-y-3 p-3 bg-muted/50 rounded-xl">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Payment</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Amount (₹)</Label>
                      <Input type="number" value={form.payment_amount} onChange={(e) => upd("payment_amount", parseInt(e.target.value) || 0)} className="mt-1 bg-muted border-border" />
                    </div>
                    <div>
                      <Label className="text-xs">UPI ID</Label>
                      <Input value={form.upi_id} onChange={(e) => upd("upi_id", e.target.value)} className="mt-1 bg-muted border-border" placeholder="name@upi" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Payment Instructions</Label>
                    <Textarea value={form.payment_instructions} onChange={(e) => upd("payment_instructions", e.target.value)} className="mt-1 bg-muted border-border" rows={2} />
                  </div>
                </div>
              )}

              {/* Replay */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                <div>
                  <Label className="text-sm font-medium">Enable Replay</Label>
                  <p className="text-[11px] text-muted-foreground">Allow viewers to watch the recording after the session</p>
                </div>
                <Switch checked={form.replay_enabled} onCheckedChange={(v) => upd("replay_enabled", v)} />
              </div>
              {form.replay_enabled && (
                <div>
                  <Label className="text-xs">Replay URL (add after session ends)</Label>
                  <Input value={form.replay_url} onChange={(e) => upd("replay_url", e.target.value)} placeholder="https://..." className="mt-1 bg-muted border-border" />
                </div>
              )}

              {/* Max attendees */}
              <div>
                <Label className="text-sm font-medium">Max Attendees (optional)</Label>
                <Input type="number" value={form.max_attendees || ""} onChange={(e) => upd("max_attendees", e.target.value ? parseInt(e.target.value) : null)} placeholder="Unlimited" className="mt-1 bg-muted border-border" />
              </div>

              <Button variant="hero" className="w-full" onClick={() => createMutation.mutate()} disabled={!form.title || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Session"}
              </Button>
            </div>
          </div>
        )}

        {/* Sessions List */}
        {isLoading ? (
          <div className="glass-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 && !creating ? (
          <div className="glass-card p-12 text-center">
            <Radio size={40} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold mb-2">No live sessions yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Create your first live session to start collecting registrations and sharing meeting links with your audience.
            </p>
            <Button variant="hero" onClick={() => setCreating(true)}>
              <Plus size={16} /> Create Your First Session
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s: any) => (
              <div key={s.id} className="glass-card p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-heading font-semibold text-sm truncate">{s.title}</h3>
                      {statusBadge(s.status, s.scheduled_at)}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {s.scheduled_at && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(new Date(s.scheduled_at), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {s.duration_minutes}m
                      </span>
                      <span className="flex items-center gap-1">
                        {accessIcon(s.access_type)}
                        {s.access_type === "lead_gated" ? "Registration" : s.access_type === "paid" ? `₹${s.payment_amount}` : "Public"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {s.registration_count || 0} registered
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {s.status === "draft" && (
                      <Button variant="default" size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "scheduled" })} disabled={!s.scheduled_at}>
                        Schedule
                      </Button>
                    )}
                    {s.status === "scheduled" && (
                      <Button variant="hero" size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "live" })}>
                        Go Live
                      </Button>
                    )}
                    {s.status === "live" && (
                      <Button variant="outline" size="sm" onClick={() => updateStatus.mutate({ id: s.id, status: "ended" })}>
                        End Session
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(`/live/${s.id}`)}>
                      <Eye size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/s/${s.slug}`);
                      toast.success("Link copied!");
                    }}>
                      <Copy size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => {
                      if (confirm("Delete this session?")) deleteMutation.mutate(s.id);
                    }}>
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <UpgradeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        type={modalType}
        resource="live sessions"
        currentCount={counts.live_sessions}
        limit={config.max_live_sessions}
        tier={tier}
      />
    </DashboardLayout>
  );
};

export default LivePage;
