import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Video, Settings, ClipboardList, Mic, MessageCircle, IndianRupee,
  Radio, Rocket, Check, Copy, Plus, Trash2, GripVertical, Lock, ExternalLink,
  Play, CreditCard, UserCheck, Calendar, Layers
} from "lucide-react";
import { VideoPickerModal } from "@/components/VideoPickerModal";

const STEP_TYPES = [
  { value: "video", label: "Video", icon: Play, description: "Show a video" },
  { value: "lead_form", label: "Lead Form", icon: ClipboardList, description: "Capture lead info" },
  { value: "cta", label: "CTA / Link", icon: ExternalLink, description: "Call-to-action button" },
  { value: "payment", label: "Payment", icon: CreditCard, description: "Collect payment" },
  { value: "manual_approval", label: "Manual Unlock", icon: UserCheck, description: "Creator unlocks manually" },
  { value: "booking", label: "Booking / Call", icon: Calendar, description: "External booking link" },
] as const;

const UNLOCK_RULES = [
  { value: "auto", label: "Auto (immediate)" },
  { value: "watch_complete", label: "Previous video completed" },
  { value: "watch_seconds", label: "Watch X seconds" },
  { value: "watch_percent", label: "Watch X percent" },
  { value: "cta_click", label: "After CTA click" },
  { value: "lead_submitted", label: "After lead form submitted" },
  { value: "payment_submitted", label: "After payment submitted" },
  { value: "manual", label: "Manual unlock by creator" },
  { value: "booking_done", label: "After booking/call completed" },
] as const;

interface FlowStep {
  id?: string;
  step_order: number;
  title: string;
  description: string;
  step_type: string;
  video_asset_id: string | null;
  is_active: boolean;
  unlock_rule_type: string;
  unlock_rule_value: string;
  cta_text: string;
  cta_url: string;
  booking_url: string;
}

const createEmptyStep = (order: number): FlowStep => ({
  step_order: order,
  title: "",
  description: "",
  step_type: "video",
  video_asset_id: null,
  is_active: true,
  unlock_rule_type: order === 0 ? "auto" : "watch_complete",
  unlock_rule_value: "",
  cta_text: "",
  cta_url: "",
  booking_url: "",
});

const editorSteps = [
  { icon: FileText, label: "Basic Info" },
  { icon: Layers, label: "Flow Mode" },
  { icon: Video, label: "Video" },
  { icon: Settings, label: "Controls" },
  { icon: ClipboardList, label: "Lead Form" },
  { icon: Mic, label: "Audio Note" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: IndianRupee, label: "Payment" },
  { icon: Radio, label: "Broadcast" },
  { icon: Rocket, label: "Publish" },
];

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "my-funnel";

const FunnelEditor = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const searchParams = new URLSearchParams(window.location.search);
  const preselectedVideoId = searchParams.get("videoId");
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const [stepVideoPickerOpen, setStepVideoPickerOpen] = useState<number | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; title: string; url: string | null } | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const [funnel, setFunnel] = useState({
    title: "", slug: "", description: "", visibility: "public", intent_type: "lead",
    funnel_mode: "single" as "single" | "multi",
    allow_seek: false, allow_speed_change: true, lock_cta: false,
    cta_enabled: true, cta_text: "Get Started", cta_timing_seconds: 60, cta_url: "",
    video_access_minutes: null as number | null,
    show_contact_buttons: false, contact_whatsapp: "", contact_phone: "", contact_instagram: "",
    show_contact_after_cta: true, whatsapp_auto_message: false, whatsapp_message_template: "Hi {name}, thanks for watching!",
    audio_note_url: "", audio_note_timing: "before", audio_note_autoplay: false, audio_lock_video: false,
    payment_enabled: false, upi_id: "", qr_code_url: "", payment_instructions: "",
    is_live_broadcast: false, broadcast_scheduled_at: "", broadcast_password: "", broadcast_replay_enabled: true,
    is_published: false,
  });

  const [leadForm, setLeadForm] = useState({
    capture_enabled: true, capture_timing: "before_video",
    show_name: true, name_required: true, show_phone: true, phone_required: true,
    show_email: false, email_required: false, show_city: true, city_required: false,
    custom_field_label: "", show_custom: false, custom_required: false,
  });

  const [flowSteps, setFlowSteps] = useState<FlowStep[]>([]);

  const { data: existingFunnel } = useQuery({
    queryKey: ["funnel", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from("funnels").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  const { data: existingLeadForm } = useQuery({
    queryKey: ["funnel-lead-form", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from("funnel_lead_form_config").select("*").eq("funnel_id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  const { data: existingSteps } = useQuery({
    queryKey: ["funnel-steps", id],
    queryFn: async () => {
      if (!id) return [];
      const { data } = await supabase
        .from("funnel_steps")
        .select("*")
        .eq("funnel_id", id)
        .order("step_order");
      return data || [];
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingFunnel) {
      setFunnel((prev) => ({
        ...prev,
        title: existingFunnel.title || "", slug: existingFunnel.slug || "", description: existingFunnel.description || "",
        visibility: existingFunnel.visibility || "public", intent_type: existingFunnel.intent_type || "lead",
        funnel_mode: (existingFunnel as any).funnel_mode || "single",
        allow_seek: existingFunnel.allow_seek || false, allow_speed_change: existingFunnel.allow_speed_change ?? true,
        lock_cta: existingFunnel.lock_cta || false,
        cta_enabled: (existingFunnel as any).cta_enabled ?? true,
        cta_text: existingFunnel.cta_text || "Get Started",
        cta_timing_seconds: existingFunnel.cta_timing_seconds || 60, cta_url: existingFunnel.cta_url || "",
        video_access_minutes: existingFunnel.video_access_minutes || null,
        show_contact_buttons: existingFunnel.show_contact_buttons || false,
        contact_whatsapp: existingFunnel.contact_whatsapp || "", contact_phone: existingFunnel.contact_phone || "",
        contact_instagram: existingFunnel.contact_instagram || "",
        show_contact_after_cta: existingFunnel.show_contact_after_cta ?? true,
        whatsapp_auto_message: existingFunnel.whatsapp_auto_message || false,
        whatsapp_message_template: existingFunnel.whatsapp_message_template || "Hi {name}, thanks for watching!",
        payment_enabled: existingFunnel.payment_enabled || false, upi_id: existingFunnel.upi_id || "",
        qr_code_url: existingFunnel.qr_code_url || "", payment_instructions: existingFunnel.payment_instructions || "",
        is_live_broadcast: existingFunnel.is_live_broadcast || false,
        broadcast_scheduled_at: existingFunnel.broadcast_scheduled_at || "",
        broadcast_password: existingFunnel.broadcast_password || "",
        broadcast_replay_enabled: existingFunnel.broadcast_replay_enabled ?? true,
        is_published: existingFunnel.is_published || false,
      }));
      if (existingFunnel.video_asset_id) {
        supabase.from("video_assets").select("id, title, public_url").eq("id", existingFunnel.video_asset_id).single().then(({ data }) => {
          if (data) setSelectedVideo({ id: data.id, title: data.title, url: data.public_url });
        });
      }
    }
  }, [existingFunnel]);

  useEffect(() => {
    if (existingLeadForm) {
      setLeadForm({
        capture_enabled: existingLeadForm.capture_enabled ?? true,
        capture_timing: existingLeadForm.capture_timing || "before_video",
        show_name: existingLeadForm.show_name ?? true, name_required: existingLeadForm.name_required ?? true,
        show_phone: existingLeadForm.show_phone ?? true, phone_required: existingLeadForm.phone_required ?? true,
        show_email: existingLeadForm.show_email ?? false, email_required: existingLeadForm.email_required ?? false,
        show_city: existingLeadForm.show_city ?? true, city_required: existingLeadForm.city_required ?? false,
        custom_field_label: existingLeadForm.custom_field_label || "", show_custom: existingLeadForm.show_custom ?? false,
        custom_required: existingLeadForm.custom_required ?? false,
      });
    }
  }, [existingLeadForm]);

  useEffect(() => {
    if (existingSteps && existingSteps.length > 0) {
      setFlowSteps(existingSteps.map((s: any) => ({
        id: s.id,
        step_order: s.step_order,
        title: s.title || "",
        description: s.description || "",
        step_type: s.step_type || "video",
        video_asset_id: s.video_asset_id,
        is_active: s.is_active ?? true,
        unlock_rule_type: s.unlock_rule_type || "auto",
        unlock_rule_value: s.unlock_rule_value || "",
        cta_text: s.cta_text || "",
        cta_url: s.cta_url || "",
        booking_url: s.booking_url || "",
      })));
    }
  }, [existingSteps]);

  useEffect(() => {
    if (preselectedVideoId && !isEdit && !selectedVideo) {
      supabase.from("video_assets").select("id, title, public_url").eq("id", preselectedVideoId).single().then(({ data }) => {
        if (data) setSelectedVideo({ id: data.id, title: data.title, url: data.public_url });
      });
    }
  }, [preselectedVideoId, isEdit, selectedVideo]);

  const buildPayload = useCallback(() => {
    if (!user) return null;
    const slug = funnel.slug || generateSlug(funnel.title);
    return {
      owner_id: user.id, title: funnel.title, slug, description: funnel.description,
      visibility: funnel.visibility, intent_type: funnel.intent_type,
      funnel_mode: funnel.funnel_mode,
      allow_seek: funnel.allow_seek, allow_speed_change: funnel.allow_speed_change,
      lock_cta: funnel.lock_cta, cta_enabled: funnel.cta_enabled,
      cta_text: funnel.cta_text, cta_timing_seconds: funnel.cta_timing_seconds,
      cta_url: funnel.cta_url || null, video_access_minutes: funnel.video_access_minutes,
      show_contact_buttons: funnel.show_contact_buttons, contact_whatsapp: funnel.contact_whatsapp || null,
      contact_phone: funnel.contact_phone || null, contact_instagram: funnel.contact_instagram || null,
      show_contact_after_cta: funnel.show_contact_after_cta,
      whatsapp_auto_message: funnel.whatsapp_auto_message, whatsapp_message_template: funnel.whatsapp_message_template || null,
      payment_enabled: funnel.payment_enabled, upi_id: funnel.upi_id || null,
      qr_code_url: funnel.qr_code_url || null, payment_instructions: funnel.payment_instructions || null,
      is_live_broadcast: funnel.is_live_broadcast, broadcast_scheduled_at: funnel.broadcast_scheduled_at || null,
      broadcast_password: funnel.broadcast_password || null, broadcast_replay_enabled: funnel.broadcast_replay_enabled,
      is_published: funnel.is_published,
      video_asset_id: selectedVideo?.id || null,
    };
  }, [user, funnel, selectedVideo]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      if (!payload) throw new Error("Not authenticated");
      let funnelId: string;
      if (isEdit) {
        const { error } = await supabase.from("funnels").update(payload).eq("id", id);
        if (error) throw error;
        await supabase.from("funnel_lead_form_config").upsert({ funnel_id: id, ...leadForm }, { onConflict: "funnel_id" });
        funnelId = id!;
      } else {
        const { data, error } = await supabase.from("funnels").insert(payload).select("id").single();
        if (error) throw error;
        await supabase.from("funnel_lead_form_config").insert({ funnel_id: data.id, ...leadForm });
        funnelId = data.id;
      }

      // Save flow steps if multi mode
      if (funnel.funnel_mode === "multi" && flowSteps.length > 0) {
        // Delete existing steps and re-insert
        await supabase.from("funnel_steps").delete().eq("funnel_id", funnelId);
        const stepsPayload = flowSteps.map((s, i) => ({
          funnel_id: funnelId,
          step_order: i,
          title: s.title,
          description: s.description || null,
          step_type: s.step_type,
          video_asset_id: s.video_asset_id || null,
          is_active: s.is_active,
          unlock_rule_type: s.unlock_rule_type,
          unlock_rule_value: s.unlock_rule_value || null,
          cta_text: s.cta_text || null,
          cta_url: s.cta_url || null,
          booking_url: s.booking_url || null,
        }));
        const { error: stepErr } = await supabase.from("funnel_steps").insert(stepsPayload);
        if (stepErr) throw stepErr;
      }

      return funnelId;
    },
    onSuccess: (funnelId) => {
      queryClient.invalidateQueries({ queryKey: ["my-funnels"] });
      queryClient.invalidateQueries({ queryKey: ["funnel-steps", id] });
      setLastSavedAt(new Date());
      toast.success(isEdit ? "Funnel updated!" : "Funnel created!");
      navigate(`/funnels/${funnelId}`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to save"),
  });

  // Auto-save every 30s when editing
  useEffect(() => {
    if (!isEdit || !id) return;
    autoSaveTimer.current = setInterval(async () => {
      const payload = buildPayload();
      if (!payload || !payload.title) return;
      try {
        await supabase.from("funnels").update(payload).eq("id", id);
        await supabase.from("funnel_lead_form_config").upsert({ funnel_id: id, ...leadForm }, { onConflict: "funnel_id" });
        setLastSavedAt(new Date());
      } catch {}
    }, 30000);
    return () => { if (autoSaveTimer.current) clearInterval(autoSaveTimer.current); };
  }, [isEdit, id, buildPayload, leadForm]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const update = (key: string, value: any) => setFunnel((p) => ({ ...p, [key]: value }));

  // Flow step helpers
  const addFlowStep = () => {
    setFlowSteps((prev) => [...prev, createEmptyStep(prev.length)]);
  };

  const updateFlowStep = (index: number, key: keyof FlowStep, value: any) => {
    setFlowSteps((prev) => prev.map((s, i) => i === index ? { ...s, [key]: value } : s));
  };

  const removeFlowStep = (index: number) => {
    setFlowSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i })));
  };

  const moveStep = (from: number, to: number) => {
    if (to < 0 || to >= flowSteps.length) return;
    setFlowSteps((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr.map((s, i) => ({ ...s, step_order: i }));
    });
  };

  // Determine which editor steps to show based on mode
  const isMulti = funnel.funnel_mode === "multi";
  const visibleSteps = isMulti
    ? editorSteps.filter((_, i) => i === 0 || i === 1 || i >= 5) // Basic, Flow Mode, WhatsApp+
    : editorSteps.filter((_, i) => i !== 1); // All except Flow Mode for single

  const totalSteps = visibleSteps.length;
  const lastStepIdx = totalSteps - 1;

  return (
    <DashboardLayout>
      <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
        {/* Step sidebar */}
        <div className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
          {visibleSteps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${step === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <s.icon size={16} />
              <span>{s.label}</span>
              {i === lastStepIdx && funnel.is_published && <Check size={14} className="ml-auto text-success" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-heading font-bold truncate">{funnel.title || "New Funnel"}</h1>
              {lastSavedAt && <p className="text-xs text-muted-foreground">Auto-saved {lastSavedAt.toLocaleTimeString()}</p>}
            </div>
            <Button variant="hero" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !funnel.title}>
              {saveMutation.isPending ? "Saving..." : "Save Funnel"}
            </Button>
          </div>

          {/* Mobile step selector */}
          <div className="lg:hidden flex gap-1 overflow-x-auto pb-3 mb-4">
            {visibleSteps.map((s, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${step === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <s.icon size={14} /> {s.label}
              </button>
            ))}
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-1 mb-4">
            {visibleSteps.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          <div className="glass-card p-6 space-y-6">
            {/* Step 0: Basic Info */}
            {step === 0 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Basic Info</h2>
                <div className="space-y-4">
                  <div><Label>Title *</Label><Input value={funnel.title} onChange={(e) => { update("title", e.target.value); if (!isEdit) update("slug", generateSlug(e.target.value)); }} className="mt-1 bg-muted border-border" /></div>
                  <div><Label>Slug</Label><div className="flex items-center gap-2 mt-1"><span className="text-xs text-muted-foreground whitespace-nowrap">/f/</span><Input value={funnel.slug} onChange={(e) => update("slug", e.target.value)} className="bg-muted border-border" /></div>
                    {funnel.slug && <p className="text-xs text-muted-foreground mt-1">{window.location.origin}/f/{funnel.slug}</p>}
                  </div>
                  <div><Label>Description</Label><Textarea value={funnel.description} onChange={(e) => update("description", e.target.value)} className="mt-1 bg-muted border-border" rows={3} /></div>
                  <div>
                    <Label>Visibility</Label>
                    <Select value={funnel.visibility} onValueChange={(v) => update("visibility", v)}>
                      <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border"><SelectItem value="public">Public</SelectItem><SelectItem value="private">Private</SelectItem><SelectItem value="password">Password Protected</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Intent Type</Label>
                    <Select value={funnel.intent_type} onValueChange={(v) => update("intent_type", v)}>
                      <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border"><SelectItem value="lead">Lead Capture</SelectItem><SelectItem value="paid">Payment Collection</SelectItem><SelectItem value="watch_only">Watch Only</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Step 1: Flow Mode (always index 1 in visibleSteps for multi, only appears in multi) */}
            {step === 1 && isMulti && (
              <>
                <h2 className="text-lg font-heading font-semibold">Flow Steps</h2>
                <p className="text-sm text-muted-foreground mb-4">Build your multi-step journey. Each step unlocks based on rules you define.</p>

                {flowSteps.length === 0 && (
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <Layers size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No steps yet. Add your first step to start building the journey.</p>
                    <Button variant="hero" size="sm" onClick={addFlowStep}><Plus size={14} /> Add First Step</Button>
                  </div>
                )}

                <div className="space-y-4">
                  {flowSteps.map((fs, idx) => {
                    const stepType = STEP_TYPES.find((t) => t.value === fs.step_type);
                    const StepIcon = stepType?.icon || Play;
                    return (
                      <div key={idx} className="border border-border rounded-xl p-4 space-y-3 relative">
                        {/* Step header */}
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button onClick={() => moveStep(idx, idx - 1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"><GripVertical size={14} /></button>
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <StepIcon size={16} className="text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Step {idx + 1}</span>
                            <Input
                              value={fs.title}
                              onChange={(e) => updateFlowStep(idx, "title", e.target.value)}
                              placeholder="Step title..."
                              className="mt-0.5 h-8 text-sm bg-transparent border-0 p-0 focus-visible:ring-0 font-semibold"
                            />
                          </div>
                          <Switch checked={fs.is_active} onCheckedChange={(v) => updateFlowStep(idx, "is_active", v)} />
                          <button onClick={() => removeFlowStep(idx)} className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <Trash2 size={14} />
                          </button>
                        </div>

                        {/* Step type selector */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {STEP_TYPES.map((t) => (
                            <button
                              key={t.value}
                              onClick={() => updateFlowStep(idx, "step_type", t.value)}
                              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs transition-all border ${
                                fs.step_type === t.value
                                  ? "border-primary bg-primary/10 text-primary font-medium"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              <t.icon size={12} />
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {/* Step-type-specific fields */}
                        {fs.step_type === "video" && (
                          <div>
                            <Label className="text-xs">Video Asset</Label>
                            {fs.video_asset_id ? (
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-muted-foreground flex-1 truncate">Video selected ✓</span>
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setStepVideoPickerOpen(idx)}>Change</Button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="mt-1 h-7 text-xs" onClick={() => setStepVideoPickerOpen(idx)}>
                                <Video size={12} /> Select Video
                              </Button>
                            )}
                          </div>
                        )}

                        {(fs.step_type === "cta" || fs.step_type === "booking") && (
                          <div className="space-y-2">
                            <div><Label className="text-xs">Button Text</Label><Input value={fs.cta_text} onChange={(e) => updateFlowStep(idx, "cta_text", e.target.value)} placeholder="Book Now" className="mt-1 h-8 text-xs bg-muted border-border" /></div>
                            <div><Label className="text-xs">{fs.step_type === "booking" ? "Booking URL" : "CTA URL"}</Label><Input value={fs.step_type === "booking" ? fs.booking_url : fs.cta_url} onChange={(e) => updateFlowStep(idx, fs.step_type === "booking" ? "booking_url" : "cta_url", e.target.value)} placeholder="https://..." className="mt-1 h-8 text-xs bg-muted border-border" /></div>
                          </div>
                        )}

                        <div><Label className="text-xs">Description (optional)</Label><Input value={fs.description} onChange={(e) => updateFlowStep(idx, "description", e.target.value)} placeholder="Brief description..." className="mt-1 h-8 text-xs bg-muted border-border" /></div>

                        {/* Unlock rule */}
                        {idx > 0 && (
                          <div className="pt-2 border-t border-border">
                            <Label className="text-xs flex items-center gap-1"><Lock size={10} /> Unlock Condition</Label>
                            <Select value={fs.unlock_rule_type} onValueChange={(v) => updateFlowStep(idx, "unlock_rule_type", v)}>
                              <SelectTrigger className="mt-1 h-8 text-xs bg-muted border-border"><SelectValue /></SelectTrigger>
                              <SelectContent className="bg-card border-border">
                                {UNLOCK_RULES.map((r) => (
                                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {(fs.unlock_rule_type === "watch_seconds" || fs.unlock_rule_type === "watch_percent") && (
                              <Input
                                type="number"
                                value={fs.unlock_rule_value}
                                onChange={(e) => updateFlowStep(idx, "unlock_rule_value", e.target.value)}
                                placeholder={fs.unlock_rule_type === "watch_seconds" ? "Seconds" : "Percent (0-100)"}
                                className="mt-2 h-8 text-xs bg-muted border-border"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {flowSteps.length > 0 && (
                    <Button variant="outline" onClick={addFlowStep} className="w-full">
                      <Plus size={14} /> Add Step
                    </Button>
                  )}
                </div>

                {/* Video picker for step videos */}
                <VideoPickerModal
                  open={stepVideoPickerOpen !== null}
                  onClose={() => setStepVideoPickerOpen(null)}
                  onSelect={(videoId, title, publicUrl) => {
                    if (stepVideoPickerOpen !== null) {
                      updateFlowStep(stepVideoPickerOpen, "video_asset_id", videoId);
                    }
                    setStepVideoPickerOpen(null);
                  }}
                />
              </>
            )}

            {/* Flow Mode selector (appears at step 1 when in single mode) */}
            {step === 1 && !isMulti && (
              <>
                <h2 className="text-lg font-heading font-semibold">Flow Mode</h2>
                <p className="text-sm text-muted-foreground mb-4">Choose how your funnel works.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => update("funnel_mode", "single")}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${funnel.funnel_mode === "single" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <Video size={24} className="text-primary mb-2" />
                    <h3 className="font-heading font-bold text-sm">Single Video</h3>
                    <p className="text-xs text-muted-foreground mt-1">One video with lead form, CTA, and payment. Simple and effective.</p>
                  </button>
                  <button
                    onClick={() => { update("funnel_mode", "multi"); if (flowSteps.length === 0) setFlowSteps([createEmptyStep(0)]); }}
                    className={`p-5 rounded-xl border-2 text-left transition-all ${funnel.funnel_mode === "multi" ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <Layers size={24} className="text-primary mb-2" />
                    <h3 className="font-heading font-bold text-sm">Multi-Step Flow</h3>
                    <p className="text-xs text-muted-foreground mt-1">Guided journey with sequential steps, unlock rules, and progress tracking.</p>
                  </button>
                </div>
              </>
            )}

            {/* Single mode steps (offset by 1 due to Flow Mode) */}
            {!isMulti && step === 2 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Video</h2>
                <p className="text-sm text-muted-foreground">Select a video from your gallery to use in this funnel.</p>
                {selectedVideo ? (
                  <div className="space-y-4">
                    <div className="border border-border rounded-xl p-4 flex items-center gap-4">
                      <div className="w-20 h-14 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                        <Video size={20} className="text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{selectedVideo.title}</p>
                        <p className="text-xs text-success mt-1">✓ Selected</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setVideoPickerOpen(true)}>Change</Button>
                    </div>
                    {selectedVideo.url && (
                      <div className="rounded-xl overflow-hidden border border-border">
                        <video src={selectedVideo.url} className="w-full aspect-video object-contain bg-black" controls playsInline />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
                    <Video size={40} className="text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground mb-3">Choose a video from your gallery</p>
                    <Button variant="hero" size="sm" onClick={() => setVideoPickerOpen(true)}>Select from Gallery</Button>
                  </div>
                )}
                <VideoPickerModal
                  open={videoPickerOpen}
                  onClose={() => setVideoPickerOpen(false)}
                  onSelect={(videoId, title, publicUrl) => {
                    setSelectedVideo({ id: videoId, title, url: publicUrl });
                    setVideoPickerOpen(false);
                  }}
                />
              </>
            )}

            {!isMulti && step === 3 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Video Controls</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold">Show CTA Button</Label>
                        <p className="text-xs text-muted-foreground mt-0.5">When off, no call-to-action button appears on the video page</p>
                      </div>
                      <Switch checked={funnel.cta_enabled} onCheckedChange={(v) => update("cta_enabled", v)} />
                    </div>
                    {funnel.cta_enabled && (
                      <div className="border-t border-border pt-4 space-y-4">
                        <div><Label>CTA Button Text</Label><Input value={funnel.cta_text} onChange={(e) => update("cta_text", e.target.value)} className="mt-1 bg-muted border-border" /></div>
                        <div><Label>CTA Appears At (seconds)</Label><Input type="number" value={funnel.cta_timing_seconds} onChange={(e) => update("cta_timing_seconds", parseInt(e.target.value) || 0)} className="mt-1 bg-muted border-border" /><p className="text-xs text-muted-foreground mt-1">CTA button appears after this many seconds of playback</p></div>
                        <div className="flex items-center justify-between"><Label>Lock CTA Until Timing</Label><Switch checked={funnel.lock_cta} onCheckedChange={(v) => update("lock_cta", v)} /></div>
                        <div><Label>CTA Link URL (optional)</Label><Input value={funnel.cta_url} onChange={(e) => update("cta_url", e.target.value)} placeholder="https://..." className="mt-1 bg-muted border-border" /><p className="text-xs text-muted-foreground mt-1">Leave empty to use the lead form</p></div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between"><Label>Allow Speed Control</Label><Switch checked={funnel.allow_speed_change} onCheckedChange={(v) => update("allow_speed_change", v)} /></div>
                  <div className="flex items-center justify-between"><Label>Allow Forward Seek</Label><Switch checked={funnel.allow_seek} onCheckedChange={(v) => update("allow_seek", v)} /></div>
                  <div>
                    <Label>Video Access Time Limit</Label>
                    <Select value={funnel.video_access_minutes?.toString() || "unlimited"} onValueChange={(v) => update("video_access_minutes", v === "unlimited" ? null : parseInt(v))}>
                      <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card border-border"><SelectItem value="unlimited">No limit</SelectItem><SelectItem value="30">30 minutes</SelectItem><SelectItem value="60">60 minutes</SelectItem><SelectItem value="120">120 minutes</SelectItem></SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {!isMulti && step === 4 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Lead Capture</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><Label>Enable Lead Capture</Label><Switch checked={leadForm.capture_enabled} onCheckedChange={(v) => setLeadForm({ ...leadForm, capture_enabled: v })} /></div>
                  {leadForm.capture_enabled && (
                    <>
                      <div>
                        <Label>When to Show Form</Label>
                        <Select value={leadForm.capture_timing} onValueChange={(v) => setLeadForm({ ...leadForm, capture_timing: v })}>
                          <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                          <SelectContent className="bg-card border-border"><SelectItem value="before_video">Before Video</SelectItem><SelectItem value="after_cta">After CTA</SelectItem><SelectItem value="immediately">Immediately</SelectItem></SelectContent>
                        </Select>
                      </div>
                      {[
                        { key: "name", label: "Full Name" }, { key: "phone", label: "Phone Number" },
                        { key: "email", label: "Email Address" }, { key: "city", label: "City" },
                      ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between gap-4 py-2 border-b border-border last:border-0">
                          <span className="text-sm">{label}</span>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              Show <Switch checked={(leadForm as any)[`show_${key}`]} onCheckedChange={(v) => setLeadForm({ ...leadForm, [`show_${key}`]: v })} />
                            </label>
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              Required <Switch checked={(leadForm as any)[`${key}_required`]} onCheckedChange={(v) => setLeadForm({ ...leadForm, [`${key}_required`]: v })} />
                            </label>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between"><Label>Custom Field</Label><Switch checked={leadForm.show_custom} onCheckedChange={(v) => setLeadForm({ ...leadForm, show_custom: v })} /></div>
                      {leadForm.show_custom && <Input placeholder="Custom field label" value={leadForm.custom_field_label} onChange={(e) => setLeadForm({ ...leadForm, custom_field_label: e.target.value })} className="bg-muted border-border" />}
                    </>
                  )}
                </div>
              </>
            )}

            {/* Common steps for both modes (Audio, WhatsApp, Payment, Broadcast, Publish) */}
            {/* These need index mapping based on mode */}
            {(() => {
              const commonStepOffset = isMulti ? 2 : 5;
              const commonIdx = step - commonStepOffset;

              if (commonIdx === 0 && step >= commonStepOffset) return (
                <>
                  <h2 className="text-lg font-heading font-semibold">Audio Note</h2>
                  <p className="text-sm text-muted-foreground">Add a personal audio message for your prospects.</p>
                  <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                    <Mic size={32} className="text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Upload audio (MP3/WAV, max 10MB)</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label>Audio Plays</Label>
                      <Select value={funnel.audio_note_timing} onValueChange={(v) => update("audio_note_timing", v)}>
                        <SelectTrigger className="mt-1 bg-muted border-border"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border"><SelectItem value="before">Before Video</SelectItem><SelectItem value="after">After Video</SelectItem><SelectItem value="at_cta">When CTA Appears</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between"><Label>Autoplay Audio</Label><Switch checked={funnel.audio_note_autoplay} onCheckedChange={(v) => update("audio_note_autoplay", v)} /></div>
                    <div className="flex items-center justify-between"><Label>Lock Video Until Audio Completes</Label><Switch checked={funnel.audio_lock_video} onCheckedChange={(v) => update("audio_lock_video", v)} /></div>
                  </div>
                </>
              );
              if (commonIdx === 1 && step >= commonStepOffset) return (
                <>
                  <h2 className="text-lg font-heading font-semibold">Contact & WhatsApp</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><Label>Show Contact Buttons</Label><Switch checked={funnel.show_contact_buttons} onCheckedChange={(v) => update("show_contact_buttons", v)} /></div>
                    {funnel.show_contact_buttons && (
                      <>
                        <Input placeholder="WhatsApp (+91...)" value={funnel.contact_whatsapp} onChange={(e) => update("contact_whatsapp", e.target.value)} className="bg-muted border-border" />
                        <Input placeholder="Phone Number" value={funnel.contact_phone} onChange={(e) => update("contact_phone", e.target.value)} className="bg-muted border-border" />
                        <Input placeholder="Instagram Handle" value={funnel.contact_instagram} onChange={(e) => update("contact_instagram", e.target.value)} className="bg-muted border-border" />
                        <div className="flex items-center justify-between"><Label>Show Only After CTA</Label><Switch checked={funnel.show_contact_after_cta} onCheckedChange={(v) => update("show_contact_after_cta", v)} /></div>
                      </>
                    )}
                    <div className="border-t border-border pt-4">
                      <div className="flex items-center justify-between"><Label>WhatsApp Auto-message</Label><Switch checked={funnel.whatsapp_auto_message} onCheckedChange={(v) => update("whatsapp_auto_message", v)} /></div>
                      {funnel.whatsapp_auto_message && (
                        <Textarea value={funnel.whatsapp_message_template} onChange={(e) => update("whatsapp_message_template", e.target.value)} className="mt-3 bg-muted border-border" placeholder="Use {name}, {phone}, {funnel_title}" rows={3} />
                      )}
                    </div>
                  </div>
                </>
              );
              if (commonIdx === 2 && step >= commonStepOffset) return (
                <>
                  <h2 className="text-lg font-heading font-semibold">Payment (UPI Manual)</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><Label>Enable Payment Collection</Label><Switch checked={funnel.payment_enabled} onCheckedChange={(v) => update("payment_enabled", v)} /></div>
                    {funnel.payment_enabled && (
                      <>
                        <div><Label>UPI ID</Label><Input value={funnel.upi_id} onChange={(e) => update("upi_id", e.target.value)} placeholder="yourname@upi" className="mt-1 bg-muted border-border" /></div>
                        <div><Label>QR Code Image URL</Label><Input value={funnel.qr_code_url} onChange={(e) => update("qr_code_url", e.target.value)} placeholder="Upload or paste QR image URL" className="mt-1 bg-muted border-border" /></div>
                        <div><Label>Payment Instructions</Label><Textarea value={funnel.payment_instructions} onChange={(e) => update("payment_instructions", e.target.value)} className="mt-1 bg-muted border-border" rows={3} /></div>
                      </>
                    )}
                  </div>
                </>
              );
              if (commonIdx === 3 && step >= commonStepOffset) return (
                <>
                  <h2 className="text-lg font-heading font-semibold">Live Broadcast</h2>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><Label>Enable Live Broadcast</Label><Switch checked={funnel.is_live_broadcast} onCheckedChange={(v) => update("is_live_broadcast", v)} /></div>
                    {funnel.is_live_broadcast && (
                      <>
                        <div><Label>Schedule Date & Time</Label><Input type="datetime-local" value={funnel.broadcast_scheduled_at} onChange={(e) => update("broadcast_scheduled_at", e.target.value)} className="mt-1 bg-muted border-border" /></div>
                        <div><Label>Broadcast Password (optional)</Label><Input value={funnel.broadcast_password} onChange={(e) => update("broadcast_password", e.target.value)} className="mt-1 bg-muted border-border" /></div>
                        <div className="flex items-center justify-between"><Label>Enable Replay After Broadcast</Label><Switch checked={funnel.broadcast_replay_enabled} onCheckedChange={(v) => update("broadcast_replay_enabled", v)} /></div>
                      </>
                    )}
                  </div>
                </>
              );
              if (commonIdx === 4 && step >= commonStepOffset) return (
                <>
                  <h2 className="text-lg font-heading font-semibold">Publish</h2>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><Check size={16} className={funnel.title ? "text-success" : "text-muted-foreground"} /><span className="text-sm">{funnel.title ? "Title added" : "Add a title"}</span></div>
                      {!isMulti && <div className="flex items-center gap-2"><Check size={16} className={selectedVideo ? "text-success" : "text-muted-foreground"} /><span className="text-sm">{selectedVideo ? "Video selected" : "Select a video"}</span></div>}
                      {isMulti && <div className="flex items-center gap-2"><Check size={16} className={flowSteps.length > 0 ? "text-success" : "text-muted-foreground"} /><span className="text-sm">{flowSteps.length > 0 ? `${flowSteps.length} flow steps configured` : "Add flow steps"}</span></div>}
                      {!isMulti && <div className="flex items-center gap-2"><Check size={16} className={leadForm.capture_enabled ? "text-success" : "text-muted-foreground"} /><span className="text-sm">{leadForm.capture_enabled ? "Lead form configured" : "Lead form disabled"}</span></div>}
                    </div>
                    {funnel.slug && (
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-xs text-muted-foreground">Funnel URL</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-sm text-primary flex-1 truncate">{window.location.origin}/f/{funnel.slug}</code>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/f/${funnel.slug}`); toast.success("Copied!"); }}>
                            <Copy size={14} />
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base font-semibold">{funnel.is_published ? "Published" : "Draft"}</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {funnel.is_published
                              ? "🟢 Your funnel is live! Anyone with the link can see it."
                              : "🔴 Only you can see this funnel. Toggle to make it public."}
                          </p>
                        </div>
                        <Switch checked={funnel.is_published} onCheckedChange={(v) => update("is_published", v)} />
                      </div>
                    </div>
                  </div>
                </>
              );
              return null;
            })()}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Previous</Button>}
            <div className="flex-1" />
            {step < lastStepIdx ? (
              <Button variant="default" onClick={() => setStep(step + 1)}>Next</Button>
            ) : (
              <Button variant="hero" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !funnel.title}>
                {saveMutation.isPending ? "Saving..." : isEdit ? "Update Funnel" : "Create Funnel"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FunnelEditor;
