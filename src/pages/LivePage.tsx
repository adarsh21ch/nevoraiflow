import { useState, useEffect, useMemo } from "react";
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
  Radio, Plus, Calendar, Users, Clock, Eye, Copy, Trash2, Video, Globe, IndianRupee, X,
  Layers, ExternalLink, ChevronLeft, ChevronRight, Trash, MessageCircle
} from "lucide-react";
import { format, formatDistanceToNow, isFuture } from "date-fns";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/UpgradeModal";

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "my-session";

const TIMEZONES = [
  "Asia/Kolkata", "Asia/Dubai", "Asia/Singapore", "Asia/Hong_Kong",
  "Europe/London", "Europe/Berlin", "America/New_York", "America/Los_Angeles", "UTC",
];

type SessionType = "funnel_video" | "external_link";

interface FormState {
  title: string;
  description: string;
  session_type: SessionType;
  // Funnel video
  funnel_id: string | null;
  video_asset_id: string | null;
  video_duration_seconds: number | null;
  // External link
  platform: string;
  meeting_url: string;
  // Schedule
  scheduled_times: string[]; // datetime-local strings
  timezone: string;
  duration_minutes: number;
  // Settings
  replay_enabled: boolean;
  replay_available_after_minutes: number;
  max_attendees: number | null;
  // Access
  access_type: string;
  show_name: boolean;
  show_phone: boolean;
  show_email: boolean;
  show_city: boolean;
  payment_amount: number;
  upi_id: string;
  payment_instructions: string;
}

const emptyForm = (): FormState => ({
  title: "", description: "", session_type: "funnel_video",
  funnel_id: null, video_asset_id: null, video_duration_seconds: null,
  platform: "zoom", meeting_url: "",
  scheduled_times: [""],
  timezone: "Asia/Kolkata",
  duration_minutes: 60,
  replay_enabled: true,
  replay_available_after_minutes: 30,
  max_attendees: null,
  access_type: "public",
  show_name: true, show_phone: true, show_email: true, show_city: false,
  payment_amount: 0, upi_id: "", payment_instructions: "",
});

const formatDuration = (sec: number | null | undefined) => {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m} min`;
  return `${m}m ${s}s`;
};

const SessionStatusBadge = ({ session }: { session: any }) => {
  // Compute live state from scheduled_times for funnel_video sessions
  const now = Date.now();
  if (session.session_type === "funnel_video") {
    const slots: number[] = (Array.isArray(session.scheduled_times) ? session.scheduled_times : [])
      .map((t: string) => new Date(t).getTime())
      .filter((n: number) => !isNaN(n))
      .sort((a: number, b: number) => a - b);
    const dur = (session.video_duration_seconds || session.duration_minutes * 60 || 3600) * 1000;
    const live = slots.find((s) => now >= s && now <= s + dur);
    if (live) {
      return (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 inline-flex items-center gap-1">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
          </span>
          LIVE
        </span>
      );
    }
    const next = slots.find((s) => s > now);
    if (next) {
      return (
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-500">
          SCHEDULED
        </span>
      );
    }
    if (session.replay_enabled) {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">REPLAY</span>;
    }
    return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">ENDED</span>;
  }
  // external_link — fall back to status field
  const cls: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    scheduled: "bg-blue-500/15 text-blue-500",
    live: "bg-red-500/15 text-red-500",
    ended: "bg-muted text-muted-foreground",
  };
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls[session.status] || cls.draft}`}>
      {(session.status || "draft").toUpperCase()}
    </span>
  );
};

const NextSlotLine = ({ session }: { session: any }) => {
  const [, force] = useState(0);
  useEffect(() => {
    const i = setInterval(() => force((x) => x + 1), 60_000);
    return () => clearInterval(i);
  }, []);
  const now = Date.now();
  if (session.session_type === "funnel_video") {
    const slots: number[] = (Array.isArray(session.scheduled_times) ? session.scheduled_times : [])
      .map((t: string) => new Date(t).getTime())
      .filter((n: number) => !isNaN(n))
      .sort((a: number, b: number) => a - b);
    const dur = (session.video_duration_seconds || session.duration_minutes * 60 || 3600) * 1000;
    const liveSlot = slots.find((s) => now >= s && now <= s + dur);
    if (liveSlot) {
      return <>Started {formatDistanceToNow(new Date(liveSlot))} ago</>;
    }
    const next = slots.find((s) => s > now);
    if (next) return <>Next: {format(new Date(next), "MMM d, h:mm a")} (in {formatDistanceToNow(new Date(next))})</>;
    if (slots.length) return <>Last aired {formatDistanceToNow(new Date(slots[slots.length - 1]))} ago</>;
    return <>No times scheduled</>;
  }
  if (session.scheduled_at && isFuture(new Date(session.scheduled_at))) {
    return <>Starts in {formatDistanceToNow(new Date(session.scheduled_at))}</>;
  }
  return <>{session.scheduled_at ? format(new Date(session.scheduled_at), "MMM d, h:mm a") : "Not scheduled"}</>;
};

const LivePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"upgrade" | "limit">("upgrade");
  const { isFree, canCreateLive, config, counts, tier } = usePlanLimits();

  const upd = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  // Sessions list
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

  // User's funnels (for funnel_video selector) — only published with a video
  const { data: funnels = [] } = useQuery({
    queryKey: ["live-funnel-options", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("funnels")
        .select("id, title, slug, thumbnail_url, video_asset_id, is_published")
        .eq("owner_id", user!.id)
        .not("video_asset_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && creating,
  });

  // When a funnel is picked, resolve video duration + asset id
  useEffect(() => {
    const run = async () => {
      if (!form.funnel_id) return;
      const f = funnels.find((x: any) => x.id === form.funnel_id);
      if (!f) return;
      if (!f.video_asset_id) {
        upd("video_asset_id", null);
        upd("video_duration_seconds", null);
        return;
      }
      const { data: video } = await supabase
        .from("video_assets")
        .select("id, duration_seconds")
        .eq("id", f.video_asset_id)
        .maybeSingle();
      if (video) {
        upd("video_asset_id", video.id);
        upd("video_duration_seconds", video.duration_seconds || null);
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.funnel_id]);

  const selectedFunnel = useMemo(
    () => funnels.find((f: any) => f.id === form.funnel_id),
    [funnels, form.funnel_id]
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = generateSlug(form.title) + "-" + Math.random().toString(36).slice(2, 7);
      const isFunnel = form.session_type === "funnel_video";
      // Convert scheduled_times to ISO; assume the local datetime-local matches the chosen tz (best-effort: use as-is)
      const scheduled_times = form.scheduled_times
        .filter((t) => !!t)
        .map((t) => new Date(t).toISOString());
      const firstSlot = scheduled_times[0] || null;

      const payload: Record<string, unknown> = {
        owner_id: user!.id,
        title: form.title,
        description: form.description || null,
        slug,
        session_type: form.session_type,
        access_type: form.access_type,
        max_attendees: form.max_attendees,
        replay_enabled: form.replay_enabled,
        timezone: form.timezone,
        scheduled_times,
        scheduled_at: firstSlot,
        status: scheduled_times.length ? "scheduled" : "draft",
        show_name: form.show_name, show_phone: form.show_phone,
        show_email: form.show_email, show_city: form.show_city,
      };

      if (isFunnel) {
        if (!form.funnel_id) throw new Error("Please select a funnel first");
        if (!scheduled_times.length) throw new Error("Please add at least one scheduled time");
        payload.funnel_id = form.funnel_id;
        payload.video_asset_id = form.video_asset_id;
        payload.video_duration_seconds = form.video_duration_seconds;
        payload.replay_available_after_minutes = form.replay_available_after_minutes;
        payload.duration_minutes = form.video_duration_seconds
          ? Math.max(1, Math.ceil(form.video_duration_seconds / 60))
          : form.duration_minutes;
      } else {
        payload.platform = form.platform;
        payload.meeting_url = form.meeting_url || null;
        payload.duration_minutes = form.duration_minutes;
      }

      if (form.access_type === "paid") {
        payload.payment_amount = form.payment_amount;
        payload.upi_id = form.upi_id || null;
        payload.payment_instructions = form.payment_instructions || null;
      }

      const { error } = await supabase.from("live_sessions").insert(payload as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Session created!");
      queryClient.invalidateQueries({ queryKey: ["live-sessions"] });
      setCreating(false);
      setStep(1);
      setForm(emptyForm());
    },
    onError: (e: any) => toast.error(e?.message || "Failed to create session"),
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

  const startCreate = () => {
    if (isFree) { setModalType("upgrade"); setModalOpen(true); return; }
    if (!canCreateLive) { setModalType("limit"); setModalOpen(true); return; }
    setForm(emptyForm());
    setStep(1);
    setCreating(true);
  };

  const shareUrl = (slug: string) => `${window.location.origin}/s/${slug}`;
  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(shareUrl(slug));
    toast.success("Link copied!");
  };
  const shareWhatsApp = (s: any) => {
    const url = shareUrl(s.slug);
    let when = "";
    if (s.session_type === "funnel_video") {
      const next = (s.scheduled_times || []).map((t: string) => new Date(t)).find((d: Date) => d.getTime() > Date.now());
      if (next) when = ` — starts at ${format(next, "MMM d, h:mm a")}`;
    } else if (s.scheduled_at) {
      when = ` — starts at ${format(new Date(s.scheduled_at), "MMM d, h:mm a")}`;
    }
    const text = `Join my live session "${s.title}"${when}.\nClick here to join: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  // ---------- Wizard steps ----------
  const totalSteps = form.session_type === "funnel_video" ? 4 : 4;
  const canNextFromStep1 = !!form.session_type;
  const canNextFromStep2 =
    form.session_type === "funnel_video"
      ? !!form.title.trim() && !!form.funnel_id
      : !!form.title.trim() && !!form.platform;
  const canNextFromStep3 =
    form.session_type === "funnel_video"
      ? form.scheduled_times.some((t) => !!t)
      : !!form.meeting_url; // external_link uses URL on step 3
  const finalCanSubmit =
    form.session_type === "funnel_video"
      ? !!form.title.trim() && !!form.funnel_id && form.scheduled_times.some(Boolean)
      : !!form.title.trim() && !!form.meeting_url;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-heading font-bold">Live</h1>
              <div className="page-header-accent" />
              <p className="text-sm text-muted-foreground mt-1">
                Schedule a funnel video to play at specific times — or share a meeting link.
              </p>
            </div>
            {!isFree && config.max_live_sessions !== -1 && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${counts.live_sessions >= config.max_live_sessions ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                {counts.live_sessions}/{config.max_live_sessions}
              </span>
            )}
          </div>
          <Button variant="hero" onClick={startCreate}>
            <Plus size={16} /> New Session
          </Button>
        </div>

        {/* Wizard modal */}
        {creating && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto pt-8 pb-8 px-4">
            <div className="glass-card w-full max-w-2xl p-6 space-y-5 relative">
              <button onClick={() => setCreating(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>

              {/* Header + progress */}
              <div>
                <h2 className="text-lg font-heading font-bold">Create Live Session</h2>
                <div className="flex items-center gap-1.5 mt-3">
                  {Array.from({ length: totalSteps }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${i + 1 <= step ? "bg-primary" : "bg-muted"}`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Step {step} of {totalSteps}</p>
              </div>

              {/* Step 1 — Session Type */}
              {step === 1 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold mb-1">How will this session be delivered?</h3>
                    <p className="text-xs text-muted-foreground">Pick how viewers will join.</p>
                  </div>
                  <button
                    onClick={() => upd("session_type", "funnel_video")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.session_type === "funnel_video" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Layers size={20} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">Use Existing Funnel</p>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">RECOMMENDED</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Pick a funnel you already created. The video plays automatically at your scheduled time — viewers see it like a real live stream.
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => upd("session_type", "external_link")}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${form.session_type === "external_link" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Video size={20} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">External Meeting Link</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Zoom, Google Meet, or any other live meeting link.
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* Step 2 — Basics + (funnel pick OR platform) */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Session Title *</Label>
                    <Input value={form.title} onChange={(e) => upd("title", e.target.value)} placeholder="e.g. Weekly Training Call" className="mt-1 bg-muted border-border" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <Textarea value={form.description} onChange={(e) => upd("description", e.target.value)} placeholder="What this session is about..." className="mt-1 bg-muted border-border" rows={2} maxLength={300} />
                  </div>

                  {form.session_type === "funnel_video" ? (
                    <div>
                      <Label className="text-sm font-medium">Select Funnel *</Label>
                      <Select value={form.funnel_id ?? "__none__"} onValueChange={(v) => upd("funnel_id", v === "__none__" ? null : v)}>
                        <SelectTrigger className="mt-1 bg-muted border-border">
                          <SelectValue placeholder="Choose a funnel..." />
                        </SelectTrigger>
                        <SelectContent>
                          {funnels.length === 0 && <SelectItem value="__none__" disabled>No funnels with video found</SelectItem>}
                          {funnels.map((f: any) => (
                            <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedFunnel && (
                        <div className="mt-3 flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                          {selectedFunnel.thumbnail_url ? (
                            <img src={selectedFunnel.thumbnail_url} alt="" className="w-16 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-16 h-12 rounded bg-muted flex items-center justify-center">
                              <Video size={16} className="text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{selectedFunnel.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Video duration: {formatDuration(form.video_duration_seconds)}
                            </p>
                          </div>
                        </div>
                      )}
                      {funnels.length === 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          You need a published funnel with a video first.{" "}
                          <button onClick={() => navigate("/funnels")} className="text-primary underline">Create one</button>.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">Platform</Label>
                        <Select value={form.platform} onValueChange={(v) => upd("platform", v)}>
                          <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zoom">Zoom</SelectItem>
                            <SelectItem value="google_meet">Google Meet</SelectItem>
                            <SelectItem value="custom">Custom Link</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Duration (mins)</Label>
                        <Input type="number" value={form.duration_minutes} onChange={(e) => upd("duration_minutes", parseInt(e.target.value) || 60)} className="mt-1 bg-muted border-border" min={5} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3 — Schedule (funnel) OR Meeting URL + schedule (external) */}
              {step === 3 && (
                <div className="space-y-4">
                  {form.session_type === "external_link" && (
                    <div>
                      <Label className="text-sm font-medium">Meeting URL *</Label>
                      <Input value={form.meeting_url} onChange={(e) => upd("meeting_url", e.target.value)} placeholder="https://zoom.us/j/..." className="mt-1 bg-muted border-border" />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">When should this play?</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Your session will play automatically at each scheduled time.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {form.scheduled_times.map((t, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          type="datetime-local"
                          value={t}
                          onChange={(e) => {
                            const arr = [...form.scheduled_times];
                            arr[idx] = e.target.value;
                            upd("scheduled_times", arr);
                          }}
                          className="bg-muted border-border flex-1"
                        />
                        {form.scheduled_times.length > 1 && (
                          <Button
                            variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0"
                            onClick={() => upd("scheduled_times", form.scheduled_times.filter((_, i) => i !== idx))}
                          >
                            <Trash size={14} />
                          </Button>
                        )}
                      </div>
                    ))}
                    {form.scheduled_times.length < 10 && (
                      <Button
                        variant="outline" size="sm" type="button"
                        onClick={() => upd("scheduled_times", [...form.scheduled_times, ""])}
                      >
                        <Plus size={14} /> Add another time
                      </Button>
                    )}
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Timezone</Label>
                    <Select value={form.timezone} onValueChange={(v) => upd("timezone", v)}>
                      <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Step 4 — Settings + Access */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                    <div>
                      <Label className="text-sm font-medium">Allow Replay</Label>
                      <p className="text-[11px] text-muted-foreground">Viewers can rewatch after session ends</p>
                    </div>
                    <Switch checked={form.replay_enabled} onCheckedChange={(v) => upd("replay_enabled", v)} />
                  </div>
                  {form.replay_enabled && form.session_type === "funnel_video" && (
                    <div>
                      <Label className="text-xs">Replay available after (minutes)</Label>
                      <Input type="number" value={form.replay_available_after_minutes} min={0}
                        onChange={(e) => upd("replay_available_after_minutes", parseInt(e.target.value) || 0)}
                        className="mt-1 bg-muted border-border" />
                    </div>
                  )}

                  <div>
                    <Label className="text-sm font-medium">Max Attendees (optional)</Label>
                    <Input type="number" value={form.max_attendees ?? ""}
                      onChange={(e) => upd("max_attendees", e.target.value ? parseInt(e.target.value) : null)}
                      placeholder="Unlimited" className="mt-1 bg-muted border-border" />
                  </div>

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

                  {(form.access_type === "lead_gated" || form.access_type === "paid") && (
                    <div className="space-y-2 p-3 bg-muted/40 rounded-xl">
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
                            <Switch checked={(form as any)[f.key]} onCheckedChange={(v) => upd(f.key as any, v as any)} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.access_type === "paid" && (
                    <div className="space-y-3 p-3 bg-muted/40 rounded-xl">
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
                </div>
              )}

              {/* Footer nav */}
              <div className="flex items-center justify-between pt-2">
                <Button variant="outline" size="sm" disabled={step === 1} onClick={() => setStep((s) => Math.max(1, s - 1))}>
                  <ChevronLeft size={14} /> Back
                </Button>
                {step < totalSteps ? (
                  <Button
                    variant="hero" size="sm"
                    disabled={
                      (step === 1 && !canNextFromStep1) ||
                      (step === 2 && !canNextFromStep2) ||
                      (step === 3 && !canNextFromStep3)
                    }
                    onClick={() => setStep((s) => s + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </Button>
                ) : (
                  <Button
                    variant="hero" size="sm"
                    disabled={!finalCanSubmit || createMutation.isPending}
                    onClick={() => createMutation.mutate()}
                  >
                    {createMutation.isPending ? "Scheduling..." : "Schedule Session"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Sessions List */}
        {isLoading ? (
          <div className="glass-card p-12 text-center">
            <p className="text-sm text-muted-foreground">Loading sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Radio size={40} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold mb-2">No live sessions yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Schedule a funnel video to play at specific times — viewers see it like a real live stream.
            </p>
            <Button variant="hero" onClick={startCreate}>
              <Plus size={16} /> Create Your First Session
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {sessions.map((s: any) => {
              const linkedFunnelTitle = s.session_type === "funnel_video"
                ? funnels.find((f: any) => f.id === s.funnel_id)?.title
                : null;
              return (
                <div key={s.id} className="glass-card p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-heading font-semibold text-sm truncate">{s.title}</h3>
                        <SessionStatusBadge session={s} />
                        {s.session_type === "funnel_video" ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
                            <Layers size={10} /> Funnel video
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted text-muted-foreground inline-flex items-center gap-1">
                            <ExternalLink size={10} /> External link
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {linkedFunnelTitle && (
                          <span className="flex items-center gap-1 truncate max-w-[200px]">
                            <Layers size={12} /> {linkedFunnelTitle}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> <NextSlotLine session={s} />
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} /> {s.registration_count || 0} registered
                        </span>
                        {s.session_type === "funnel_video" && Array.isArray(s.scheduled_times) && s.scheduled_times.length > 1 && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {s.scheduled_times.length} slots
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => copyLink(s.slug)}>
                        <Copy size={14} /> Copy Link
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Share on WhatsApp" onClick={() => shareWhatsApp(s)}>
                        <MessageCircle size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="View" onClick={() => navigate(`/live/${s.id}`)}>
                        <Eye size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Delete" onClick={() => {
                        if (confirm("Delete this session?")) deleteMutation.mutate(s.id);
                      }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
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
