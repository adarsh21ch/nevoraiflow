import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  FileText, Palette, ClipboardList, Mail, Video, Link2, Rocket,
  Save, ArrowLeft, Check, X, Plus, Trash2, GripVertical,
} from "lucide-react";
import { toast } from "sonner";

const generateSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

const defaultFormState = {
  title: "",
  slug: "",
  description: "",
  status: "draft",
  sections: [] as any[],
  form_title: "Register for the Session",
  form_subtitle: "Fill in your details to secure your spot",
  form_button_text: "Register Now",
  field_name_enabled: true, field_name_required: true,
  field_phone_enabled: true, field_phone_required: true,
  field_email_enabled: true, field_email_required: true,
  field_age_enabled: false, field_age_required: false,
  field_city_enabled: false, field_city_required: false,
  field_state_enabled: false, field_state_required: false,
  field_occupation_enabled: false, field_occupation_required: false,
  field_custom_1_enabled: false, field_custom_1_label: "", field_custom_1_required: false,
  field_custom_2_enabled: false, field_custom_2_label: "", field_custom_2_required: false,
  send_confirmation_email: true,
  email_subject: "Your Registration is Confirmed!",
  email_heading: "Welcome! You are registered.",
  email_body: "Thank you for registering. We look forward to seeing you at the session.",
  email_footer_text: "",
  post_submit_video_asset_id: null as string | null,
  post_submit_video_title: "Watch this introduction",
  post_submit_video_description: "",
  linked_funnel_id: null as string | null,
  allow_login: true,
  allow_signup: true,
  invite_code_required: false,
  invite_code: "",
  og_title: "",
  og_description: "",
  og_image_url: "",
  theme_color: "#22c55e",
  background_style: "dark",
};

const sectionTypes = [
  { type: "hero", label: "Hero Section", icon: "🎯" },
  { type: "text", label: "Text Block", icon: "📝" },
  { type: "features", label: "Features / Benefits", icon: "✨" },
  { type: "testimonials", label: "Testimonials", icon: "💬" },
  { type: "faq", label: "FAQ", icon: "❓" },
  { type: "speaker", label: "Speaker / Host", icon: "🎤" },
  { type: "image", label: "Image", icon: "🖼️" },
];

const formFields = [
  { key: "name", label: "Full Name" },
  { key: "phone", label: "Phone Number" },
  { key: "email", label: "Email Address" },
  { key: "age", label: "Age" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "occupation", label: "Current Occupation" },
];

const WIZARD_STEPS = [
  { icon: FileText, label: "Page Info", num: "1" },
  { icon: Palette, label: "Design", num: "2" },
  { icon: ClipboardList, label: "Form", num: "3" },
  { icon: Mail, label: "Email", num: "4" },
  { icon: Video, label: "Video", num: "5" },
  { icon: Link2, label: "Links", num: "6" },
  { icon: Rocket, label: "Publish", num: "7" },
];

const LandingPageEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(defaultFormState);
  const [slugEdited, setSlugEdited] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["landing-page", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("landing_pages").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: isEdit,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["my-videos", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("video_assets").select("id,title,public_url,thumbnail_url").eq("owner_id", user!.id).eq("status", "ready");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: funnels = [] } = useQuery({
    queryKey: ["my-funnels", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("funnels").select("id,title,slug").eq("owner_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (existing) {
      setForm({
        ...defaultFormState,
        ...existing,
        sections: (existing.sections as any[]) || [],
      });
      setSlugEdited(true);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { ...form, owner_id: user!.id };
      if (isEdit) {
        const { error } = await supabase.from("landing_pages").update(payload as any).eq("id", id!);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("landing_pages").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Landing page updated" : "Landing page created");
      queryClient.invalidateQueries({ queryKey: ["landing-pages"] });
      if (!isEdit) navigate("/landing-pages");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save"),
  });

  const updateField = (key: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && !slugEdited) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const addSection = (type: string) => {
    const defaults: Record<string, any> = {
      hero: { type: "hero", headline: "", subheadline: "", image_url: "", cta_text: "" },
      text: { type: "text", heading: "", body: "", alignment: "left" },
      features: { type: "features", title: "What You Will Learn", items: [{ emoji: "✅", text: "" }], layout: "list" },
      testimonials: { type: "testimonials", title: "What People Say", items: [{ name: "", role: "", quote: "" }] },
      faq: { type: "faq", title: "Frequently Asked Questions", items: [{ question: "", answer: "" }] },
      speaker: { type: "speaker", name: "", title: "", photo_url: "", bio: "" },
      image: { type: "image", url: "", caption: "", size: "full" },
    };
    setForm((prev) => ({ ...prev, sections: [...prev.sections, defaults[type] || { type }] }));
  };

  const updateSection = (index: number, updates: any) => {
    setForm((prev) => {
      const sections = [...prev.sections];
      sections[index] = { ...sections[index], ...updates };
      return { ...prev, sections };
    });
  };

  const removeSection = (index: number) => {
    setForm((prev) => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  };

  if (isEdit && isLoading) {
    return <DashboardLayout><div className="animate-pulse p-8">Loading...</div></DashboardLayout>;
  }

  const totalSteps = WIZARD_STEPS.length;
  const lastStepIdx = totalSteps - 1;

  // ── Step renderers ──
  const renderPageInfo = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Page Info</h2>
      <p className="text-sm text-muted-foreground">Basic information about your landing page.</p>
      <div className="space-y-4 mt-4">
        <div>
          <Label>Landing Page Title *</Label>
          <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Join Our Exclusive Business Session" className="mt-1.5 bg-muted border-border" />
        </div>
        <div>
          <Label>Slug *</Label>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-sm text-muted-foreground whitespace-nowrap">/l/</span>
            <Input value={form.slug} onChange={(e) => { setSlugEdited(true); updateField("slug", e.target.value); }} className="bg-muted border-border" />
          </div>
        </div>
        <div>
          <Label>Short Description</Label>
          <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="A brief description shown below the title" className="mt-1.5 bg-muted border-border" />
        </div>
      </div>
    </>
  );

  const renderDesign = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Design</h2>
      <p className="text-sm text-muted-foreground">Customize the look and content sections.</p>
      <div className="space-y-4 mt-4">
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <Label className="font-semibold">Background Style</Label>
          <Select value={form.background_style} onValueChange={(v) => updateField("background_style", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="gradient">Gradient</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <Label className="font-semibold">Theme Color</Label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.theme_color} onChange={(e) => updateField("theme_color", e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
            <Input value={form.theme_color} onChange={(e) => updateField("theme_color", e.target.value)} className="w-32 bg-muted border-border" />
          </div>
        </div>

        <div className="border-t pt-5 space-y-4">
          <h3 className="font-semibold">Page Sections</h3>
          {form.sections.map((section, i) => (
            <div key={i} className="p-4 bg-muted/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GripVertical size={14} className="text-muted-foreground" />
                  <Badge variant="outline" className="capitalize">{section.type}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSection(i)}>
                  <Trash2 size={14} />
                </Button>
              </div>
              {section.type === "hero" && (
                <div className="space-y-3">
                  <Input placeholder="Headline" value={section.headline || ""} onChange={(e) => updateSection(i, { headline: e.target.value })} className="bg-muted border-border" />
                  <Input placeholder="Subheadline" value={section.subheadline || ""} onChange={(e) => updateSection(i, { subheadline: e.target.value })} className="bg-muted border-border" />
                  <Input placeholder="Hero image URL" value={section.image_url || ""} onChange={(e) => updateSection(i, { image_url: e.target.value })} className="bg-muted border-border" />
                  <Input placeholder="CTA text above form" value={section.cta_text || ""} onChange={(e) => updateSection(i, { cta_text: e.target.value })} className="bg-muted border-border" />
                </div>
              )}
              {section.type === "text" && (
                <div className="space-y-3">
                  <Input placeholder="Heading" value={section.heading || ""} onChange={(e) => updateSection(i, { heading: e.target.value })} className="bg-muted border-border" />
                  <Textarea placeholder="Body text" value={section.body || ""} onChange={(e) => updateSection(i, { body: e.target.value })} rows={4} className="bg-muted border-border" />
                </div>
              )}
              {section.type === "features" && (
                <div className="space-y-3">
                  <Input placeholder="Section title" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} className="bg-muted border-border" />
                  {(section.items || []).map((item: any, j: number) => (
                    <div key={j} className="flex items-center gap-2">
                      <Input className="w-14 bg-muted border-border" value={item.emoji} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, emoji: e.target.value };
                        updateSection(i, { items });
                      }} />
                      <Input className="flex-1 bg-muted border-border" placeholder="Benefit..." value={item.text} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, text: e.target.value };
                        updateSection(i, { items });
                      }} />
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                        const items = section.items.filter((_: any, k: number) => k !== j);
                        updateSection(i, { items });
                      }}><X size={12} /></Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateSection(i, { items: [...(section.items || []), { emoji: "✅", text: "" }] })}>
                    <Plus size={12} className="mr-1" /> Add Item
                  </Button>
                </div>
              )}
              {section.type === "faq" && (
                <div className="space-y-3">
                  <Input placeholder="Section title" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} className="bg-muted border-border" />
                  {(section.items || []).map((item: any, j: number) => (
                    <div key={j} className="space-y-2 border border-border rounded-lg p-3">
                      <Input placeholder="Question" value={item.question} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, question: e.target.value };
                        updateSection(i, { items });
                      }} className="bg-muted border-border" />
                      <Textarea placeholder="Answer" value={item.answer} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, answer: e.target.value };
                        updateSection(i, { items });
                      }} rows={2} className="bg-muted border-border" />
                      <Button variant="ghost" size="sm" onClick={() => {
                        const items = section.items.filter((_: any, k: number) => k !== j);
                        updateSection(i, { items });
                      }}><Trash2 size={12} className="mr-1" /> Remove</Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateSection(i, { items: [...(section.items || []), { question: "", answer: "" }] })}>
                    <Plus size={12} className="mr-1" /> Add Q&A
                  </Button>
                </div>
              )}
              {section.type === "testimonials" && (
                <div className="space-y-3">
                  <Input placeholder="Section title" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} className="bg-muted border-border" />
                  {(section.items || []).map((item: any, j: number) => (
                    <div key={j} className="space-y-2 border border-border rounded-lg p-3">
                      <Input placeholder="Name" value={item.name} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, name: e.target.value };
                        updateSection(i, { items });
                      }} className="bg-muted border-border" />
                      <Input placeholder="Role" value={item.role} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, role: e.target.value };
                        updateSection(i, { items });
                      }} className="bg-muted border-border" />
                      <Textarea placeholder="Quote" value={item.quote} onChange={(e) => {
                        const items = [...section.items]; items[j] = { ...item, quote: e.target.value };
                        updateSection(i, { items });
                      }} rows={2} className="bg-muted border-border" />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={() => updateSection(i, { items: [...(section.items || []), { name: "", role: "", quote: "" }] })}>
                    <Plus size={12} className="mr-1" /> Add Testimonial
                  </Button>
                </div>
              )}
              {section.type === "speaker" && (
                <div className="space-y-3">
                  <Input placeholder="Speaker name" value={section.name || ""} onChange={(e) => updateSection(i, { name: e.target.value })} className="bg-muted border-border" />
                  <Input placeholder="Title / Role" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} className="bg-muted border-border" />
                  <Input placeholder="Photo URL" value={section.photo_url || ""} onChange={(e) => updateSection(i, { photo_url: e.target.value })} className="bg-muted border-border" />
                  <Textarea placeholder="Bio" value={section.bio || ""} onChange={(e) => updateSection(i, { bio: e.target.value })} rows={3} className="bg-muted border-border" />
                </div>
              )}
              {section.type === "image" && (
                <div className="space-y-3">
                  <Input placeholder="Image URL" value={section.url || ""} onChange={(e) => updateSection(i, { url: e.target.value })} className="bg-muted border-border" />
                  <Input placeholder="Caption (optional)" value={section.caption || ""} onChange={(e) => updateSection(i, { caption: e.target.value })} className="bg-muted border-border" />
                </div>
              )}
            </div>
          ))}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {sectionTypes.map((st) => (
              <Button key={st.type} variant="outline" size="sm" onClick={() => addSection(st.type)} className="justify-start text-xs">
                <span className="mr-1">{st.icon}</span> {st.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  const renderFormStep = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Registration Form</h2>
      <p className="text-sm text-muted-foreground">Configure the fields viewers fill out.</p>
      <div className="space-y-4 mt-4">
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <div><Label>Form Title</Label><Input value={form.form_title} onChange={(e) => updateField("form_title", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
          <div><Label>Form Subtitle</Label><Input value={form.form_subtitle} onChange={(e) => updateField("form_subtitle", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
          <div><Label>Submit Button Text</Label><Input value={form.form_button_text} onChange={(e) => updateField("form_button_text", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <h3 className="font-semibold">Form Fields</h3>
          <div className="border border-border rounded-xl divide-y divide-border overflow-hidden">
            {formFields.map((f) => {
              const enabledKey = `field_${f.key}_enabled` as keyof typeof form;
              const requiredKey = `field_${f.key}_required` as keyof typeof form;
              return (
                <div key={f.key} className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <Switch checked={form[enabledKey] as boolean} onCheckedChange={(v) => updateField(enabledKey, v)} />
                    <span className={!(form[enabledKey] as boolean) ? "text-muted-foreground text-sm" : "text-sm font-medium"}>{f.label}</span>
                  </div>
                  {form[enabledKey] as boolean && (
                    <div className="flex items-center gap-2 text-sm">
                      <Switch checked={form[requiredKey] as boolean} onCheckedChange={(v) => updateField(requiredKey, v)} />
                      <span className="text-muted-foreground text-xs">Required</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Custom fields */}
        {[1, 2].map((n) => {
          const enabledKey = `field_custom_${n}_enabled` as keyof typeof form;
          const labelKey = `field_custom_${n}_label` as keyof typeof form;
          const requiredKey = `field_custom_${n}_required` as keyof typeof form;
          return (
            <div key={n} className="p-4 bg-muted/50 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch checked={form[enabledKey] as boolean} onCheckedChange={(v) => updateField(enabledKey, v)} />
                  <span className="text-sm font-medium">Custom Field {n}</span>
                </div>
                {form[enabledKey] as boolean && (
                  <div className="flex items-center gap-2 text-sm">
                    <Switch checked={form[requiredKey] as boolean} onCheckedChange={(v) => updateField(requiredKey, v)} />
                    <span className="text-muted-foreground text-xs">Required</span>
                  </div>
                )}
              </div>
              {form[enabledKey] as boolean && (
                <Input placeholder="Field label..." value={form[labelKey] as string} onChange={(e) => updateField(labelKey, e.target.value)} className="bg-muted border-border" />
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  const renderEmailStep = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Confirmation Email</h2>
      <p className="text-sm text-muted-foreground">Configure the email sent after registration.</p>
      <div className="space-y-4 mt-4">
        <div className="p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Send confirmation email</Label>
            <Switch checked={form.send_confirmation_email} onCheckedChange={(v) => updateField("send_confirmation_email", v)} />
          </div>
        </div>
        {form.send_confirmation_email && (
          <div className="p-4 bg-muted/50 rounded-xl space-y-3 animate-in slide-in-from-top-2 duration-300">
            <div><Label>Email Subject</Label><Input value={form.email_subject} onChange={(e) => updateField("email_subject", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
            <div><Label>Email Heading</Label><Input value={form.email_heading} onChange={(e) => updateField("email_heading", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
            <div>
              <Label>Email Body</Label>
              <Textarea value={form.email_body} onChange={(e) => updateField("email_body", e.target.value)} rows={6} className="mt-1.5 bg-muted border-border" />
              <p className="text-xs text-muted-foreground mt-1">Variables: {"{{name}}"}, {"{{email}}"}, {"{{phone}}"}</p>
            </div>
            <div><Label>Email Footer</Label><Input value={form.email_footer_text} onChange={(e) => updateField("email_footer_text", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
          </div>
        )}
      </div>
    </>
  );

  const renderVideoStep = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Post-Submit Video</h2>
      <p className="text-sm text-muted-foreground">Show a video after successful registration.</p>
      <div className="space-y-4 mt-4">
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <Label className="font-semibold">Select Video</Label>
          <Select value={form.post_submit_video_asset_id || "__none__"} onValueChange={(v) => updateField("post_submit_video_asset_id", v === "__none__" ? null : v)}>
            <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="Select a video..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {videos.map((v: any) => (
                <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <div><Label>Video Title</Label><Input value={form.post_submit_video_title} onChange={(e) => updateField("post_submit_video_title", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
          <div><Label>Video Description</Label><Textarea value={form.post_submit_video_description} onChange={(e) => updateField("post_submit_video_description", e.target.value)} rows={3} className="mt-1.5 bg-muted border-border" /></div>
        </div>
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <Label className="font-semibold">Link to Funnel (after video)</Label>
          <Select value={form.linked_funnel_id || "__none__"} onValueChange={(v) => updateField("linked_funnel_id", v === "__none__" ? null : v)}>
            <SelectTrigger className="bg-muted border-border"><SelectValue placeholder="No linked funnel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {funnels.map((f: any) => (
                <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </>
  );

  const renderLinksStep = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Links & Auth</h2>
      <p className="text-sm text-muted-foreground">Configure URL, authentication, and SEO settings.</p>
      <div className="space-y-4 mt-4">
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <Label className="font-semibold">Landing Page URL</Label>
          <div className="flex items-center gap-2">
            <Input readOnly value={`${window.location.origin}/l/${form.slug}`} className="bg-muted border-border" />
            <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/l/${form.slug}`); toast.success("Copied!"); }}>
              <Link2 size={14} />
            </Button>
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <h3 className="font-semibold">Authentication</h3>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm">Show Login button</Label>
            <Switch checked={form.allow_login} onCheckedChange={(v) => updateField("allow_login", v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <Label className="text-sm">Show Sign Up button</Label>
            <Switch checked={form.allow_signup} onCheckedChange={(v) => updateField("allow_signup", v)} />
          </div>
        </div>

        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <h3 className="font-semibold">SEO / Social</h3>
          <div><Label>OG Title</Label><Input value={form.og_title || ""} onChange={(e) => updateField("og_title", e.target.value)} placeholder={form.title} className="mt-1.5 bg-muted border-border" /></div>
          <div><Label>OG Description</Label><Textarea value={form.og_description || ""} onChange={(e) => updateField("og_description", e.target.value)} rows={2} className="mt-1.5 bg-muted border-border" /></div>
          <div><Label>OG Image URL</Label><Input value={form.og_image_url || ""} onChange={(e) => updateField("og_image_url", e.target.value)} className="mt-1.5 bg-muted border-border" /></div>
        </div>
      </div>
    </>
  );

  const renderPublishStep = () => (
    <>
      <h2 className="text-lg font-heading font-semibold">Publish</h2>
      <p className="text-sm text-muted-foreground">Review and publish your landing page.</p>
      <div className="space-y-4 mt-4">
        <div className="p-4 bg-muted/50 rounded-xl space-y-3">
          <Label className="font-semibold">Status</Label>
          <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
            <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border border-border rounded-xl p-4 space-y-2.5">
          <h3 className="font-semibold mb-2">Publish Checklist</h3>
          {[
            { ok: !!form.title, label: "Title added" },
            { ok: form.sections.length > 0, label: "At least one section added" },
            { ok: form.field_email_enabled, label: "Email field enabled" },
            { ok: form.send_confirmation_email, label: "Confirmation email configured" },
            { ok: !!form.post_submit_video_asset_id, label: "Post-submit video (optional)" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {item.ok ? <Check size={16} className="text-primary" /> : <X size={16} className="text-muted-foreground" />}
              <span className={item.ok ? "" : "text-muted-foreground"}>{item.label}</span>
            </div>
          ))}
        </div>

        <Button
          className="w-full"
          variant="hero"
          onClick={() => {
            updateField("status", "published");
            setTimeout(() => saveMutation.mutate(), 100);
          }}
          disabled={!form.title || saveMutation.isPending}
        >
          <Rocket size={16} className="mr-2" /> Publish Landing Page
        </Button>
      </div>
    </>
  );

  const renderWizardContent = () => {
    switch (wizardStep) {
      case 0: return renderPageInfo();
      case 1: return renderDesign();
      case 2: return renderFormStep();
      case 3: return renderEmailStep();
      case 4: return renderVideoStep();
      case 5: return renderLinksStep();
      case 6: return renderPublishStep();
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
        {/* Sidebar nav — desktop only */}
        <div className="hidden lg:flex flex-col gap-1 w-48 shrink-0">
          {WIZARD_STEPS.map((s, i) => (
            <button key={i} onClick={() => setWizardStep(i)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                wizardStep === i
                  ? "bg-primary/10 border-l-[3px] border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border-l-[3px] border-transparent"
              }`}
            >
              <s.icon size={15} className={wizardStep === i ? "text-primary" : ""} />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.05em] text-muted-foreground/50">{s.num}</p>
                <p className="text-[13px] font-semibold leading-tight">{s.label}</p>
              </div>
              {i === lastStepIdx && form.status === "published" && <Check size={14} className="ml-auto text-emerald-500" />}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 max-w-2xl min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/landing-pages")}>
                <ArrowLeft size={18} />
              </Button>
              <h1 className="text-lg sm:text-xl font-heading font-bold truncate">{form.title || (isEdit ? "Edit Landing Page" : "New Landing Page")}</h1>
            </div>
            <Button variant="hero" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title} className="shrink-0 ml-2">
              <Save size={14} className="mr-1.5" /> {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>

          {/* Mobile compact step selector */}
          <div className="lg:hidden grid grid-cols-4 sm:grid-cols-5 gap-1.5 pb-3 mb-3">
            {WIZARD_STEPS.map((s, i) => (
              <button key={i} onClick={() => setWizardStep(i)}
                className={`flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg text-[10px] font-semibold transition-all ${
                  wizardStep === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground"
                }`}
              >
                <s.icon size={14} />
                <span className="truncate w-full text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1 mb-4">
            {WIZARD_STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= wizardStep ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>

          {/* Content card */}
          <div className="glass-card p-4 sm:p-6 space-y-4">
            {renderWizardContent()}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 mt-4">
            {wizardStep > 0 && <Button variant="outline" size="sm" onClick={() => setWizardStep(wizardStep - 1)}>Previous</Button>}
            <div className="flex-1" />
            {wizardStep < lastStepIdx ? (
              <Button variant="default" size="sm" onClick={() => setWizardStep(wizardStep + 1)}>Next</Button>
            ) : (
              <Button variant="hero" size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
                {saveMutation.isPending ? "Saving..." : isEdit ? "Update" : "Create Landing Page"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LandingPageEditor;
