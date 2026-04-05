import { useState, useEffect } from "react";
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
import { Video, Settings, ClipboardList, Mic, MessageCircle, IndianRupee, Radio, FileText, Rocket, Check, Copy, QrCode } from "lucide-react";
import { VideoPickerModal } from "@/components/VideoPickerModal";


const steps = [
  { icon: Video, label: "Video" },
  { icon: Settings, label: "Controls" },
  { icon: ClipboardList, label: "Lead Form" },
  { icon: Mic, label: "Audio Note" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: IndianRupee, label: "Payment" },
  { icon: Radio, label: "Broadcast" },
  { icon: FileText, label: "Basic Info" },
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
  const [saving, setSaving] = useState(false);
  const [funnel, setFunnel] = useState({
    title: "", slug: "", description: "", visibility: "public", intent_type: "lead",
    allow_seek: false, allow_speed_change: true, lock_cta: false,
    cta_text: "Get Started", cta_timing_seconds: 60, cta_url: "",
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

  const { data: existingFunnel } = useQuery({
    queryKey: ["funnel", id],
    queryFn: async () => {
      if (!id) return null;
      const { data } = await supabase.from("funnels").select("*").eq("id", id).single();
      return data;
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingFunnel) {
      setFunnel((prev) => ({
        ...prev,
        title: existingFunnel.title || "", slug: existingFunnel.slug || "", description: existingFunnel.description || "",
        visibility: existingFunnel.visibility || "public", intent_type: existingFunnel.intent_type || "lead",
        allow_seek: existingFunnel.allow_seek || false, allow_speed_change: existingFunnel.allow_speed_change ?? true,
        lock_cta: existingFunnel.lock_cta || false, cta_text: existingFunnel.cta_text || "Get Started",
        cta_timing_seconds: existingFunnel.cta_timing_seconds || 60, cta_url: existingFunnel.cta_url || "",
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
    }
  }, [existingFunnel]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const slug = funnel.slug || generateSlug(funnel.title);
      const payload = {
        owner_id: user.id, title: funnel.title, slug, description: funnel.description,
        visibility: funnel.visibility, intent_type: funnel.intent_type,
        allow_seek: funnel.allow_seek, allow_speed_change: funnel.allow_speed_change,
        lock_cta: funnel.lock_cta, cta_text: funnel.cta_text, cta_timing_seconds: funnel.cta_timing_seconds,
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
      };

      if (isEdit) {
        const { error } = await supabase.from("funnels").update(payload).eq("id", id);
        if (error) throw error;
        // Update lead form
        await supabase.from("funnel_lead_form_config").upsert({ funnel_id: id, ...leadForm }, { onConflict: "funnel_id" });
        return id;
      } else {
        const { data, error } = await supabase.from("funnels").insert(payload).select("id").single();
        if (error) throw error;
        await supabase.from("funnel_lead_form_config").insert({ funnel_id: data.id, ...leadForm });
        return data.id;
      }
    },
    onSuccess: (funnelId) => {
      queryClient.invalidateQueries({ queryKey: ["my-funnels"] });
      toast.success(isEdit ? "Funnel updated!" : "Funnel created!");
      navigate(`/funnels/${funnelId}`);
    },
    onError: (err: any) => toast.error(err.message || "Failed to save"),
  });

  const update = (key: string, value: any) => setFunnel((p) => ({ ...p, [key]: value }));

  return (
    <DashboardLayout>
      <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
        {/* Step sidebar */}
        <div className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
          {steps.map((s, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${step === i ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              <s.icon size={16} />
              <span>{s.label}</span>
              {i === 8 && funnel.is_published && <Check size={14} className="ml-auto text-success" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <Input value={funnel.title} onChange={(e) => { update("title", e.target.value); if (!isEdit) update("slug", generateSlug(e.target.value)); }}
              placeholder="Funnel Title" className="text-xl font-heading font-bold bg-transparent border-none p-0 h-auto focus-visible:ring-0" />
            <Button variant="hero" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !funnel.title}>
              {saveMutation.isPending ? "Saving..." : "Save Funnel"}
            </Button>
          </div>

          {/* Mobile step selector */}
          <div className="lg:hidden flex gap-1 overflow-x-auto pb-3 mb-4">
            {steps.map((s, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs whitespace-nowrap ${step === i ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                <s.icon size={14} /> {s.label}
              </button>
            ))}
          </div>

          <div className="glass-card p-6 space-y-6">
            {step === 0 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Video</h2>
                <p className="text-sm text-muted-foreground">Select or upload a video for this funnel. Video upload via Cloudflare R2 will be connected in the next step.</p>
                <div className="border-2 border-dashed border-border rounded-xl p-12 text-center">
                  <Video size={40} className="text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground mb-3">Drag & drop a video file or click to browse</p>
                  <Button variant="outline" size="sm">Select from Gallery</Button>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Video Controls</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><Label>Allow Speed Control</Label><Switch checked={funnel.allow_speed_change} onCheckedChange={(v) => update("allow_speed_change", v)} /></div>
                  <div className="flex items-center justify-between"><Label>Allow Forward Seek</Label><Switch checked={funnel.allow_seek} onCheckedChange={(v) => update("allow_seek", v)} /></div>
                  <div className="flex items-center justify-between"><Label>Lock CTA Until Timing</Label><Switch checked={funnel.lock_cta} onCheckedChange={(v) => update("lock_cta", v)} /></div>
                  <div><Label>CTA Button Text</Label><Input value={funnel.cta_text} onChange={(e) => update("cta_text", e.target.value)} className="mt-1 bg-muted border-border" /></div>
                  <div><Label>CTA Appears At (seconds)</Label><Input type="number" value={funnel.cta_timing_seconds} onChange={(e) => update("cta_timing_seconds", parseInt(e.target.value) || 0)} className="mt-1 bg-muted border-border" /></div>
                  <div><Label>CTA Link URL (optional)</Label><Input value={funnel.cta_url} onChange={(e) => update("cta_url", e.target.value)} placeholder="https://..." className="mt-1 bg-muted border-border" /></div>
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

            {step === 2 && (
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

            {step === 3 && (
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
            )}

            {step === 4 && (
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
            )}

            {step === 5 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Payment (UPI Manual)</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><Label>Enable Payment Collection</Label><Switch checked={funnel.payment_enabled} onCheckedChange={(v) => update("payment_enabled", v)} /></div>
                  {funnel.payment_enabled && (
                    <>
                      <div><Label>UPI ID</Label><Input value={funnel.upi_id} onChange={(e) => update("upi_id", e.target.value)} placeholder="yourname@upi" className="mt-1 bg-muted border-border" /></div>
                      <div>
                        <Label>QR Code Image URL</Label>
                        <Input value={funnel.qr_code_url} onChange={(e) => update("qr_code_url", e.target.value)} placeholder="Upload or paste QR image URL" className="mt-1 bg-muted border-border" />
                      </div>
                      <div><Label>Payment Instructions</Label><Textarea value={funnel.payment_instructions} onChange={(e) => update("payment_instructions", e.target.value)} className="mt-1 bg-muted border-border" rows={3} /></div>
                    </>
                  )}
                </div>
              </>
            )}

            {step === 6 && (
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
            )}

            {step === 7 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Basic Info</h2>
                <div className="space-y-4">
                  <div><Label>Title *</Label><Input value={funnel.title} onChange={(e) => { update("title", e.target.value); if (!isEdit) update("slug", generateSlug(e.target.value)); }} className="mt-1 bg-muted border-border" /></div>
                  <div><Label>Slug</Label><div className="flex items-center gap-2 mt-1"><span className="text-xs text-muted-foreground">/f/</span><Input value={funnel.slug} onChange={(e) => update("slug", e.target.value)} className="bg-muted border-border" /></div></div>
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

            {step === 8 && (
              <>
                <h2 className="text-lg font-heading font-semibold">Publish</h2>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2"><Check size={16} className={funnel.title ? "text-success" : "text-muted-foreground"} /><span className="text-sm">{funnel.title ? "Title added" : "Add a title"}</span></div>
                    <div className="flex items-center gap-2"><Check size={16} className={leadForm.capture_enabled ? "text-success" : "text-muted-foreground"} /><span className="text-sm">{leadForm.capture_enabled ? "Lead form configured" : "Lead form disabled"}</span></div>
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
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-base font-semibold">{funnel.is_published ? "Published" : "Draft"}</Label>
                      <p className="text-xs text-muted-foreground mt-1">{funnel.is_published ? "Your funnel is live!" : "Toggle to make your funnel public"}</p>
                    </div>
                    <Switch checked={funnel.is_published} onCheckedChange={(v) => update("is_published", v)} />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-6">
            {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)}>Previous</Button>}
            <div className="flex-1" />
            {step < 8 ? (
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
