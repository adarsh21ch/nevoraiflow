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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

const LandingPageEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!id;
  const [tab, setTab] = useState("info");
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

  const tabItems = [
    { value: "info", label: "Page Info", icon: FileText },
    { value: "design", label: "Design", icon: Palette },
    { value: "form", label: "Form", icon: ClipboardList },
    { value: "email", label: "Email", icon: Mail },
    { value: "video", label: "Video", icon: Video },
    { value: "links", label: "Links", icon: Link2 },
    { value: "publish", label: "Publish", icon: Rocket },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/landing-pages")}>
            <ArrowLeft size={18} />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{isEdit ? "Edit Landing Page" : "Create Landing Page"}</h1>
          </div>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !form.title}>
            <Save size={16} className="mr-2" /> {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex flex-wrap h-auto gap-1">
            {tabItems.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 text-xs sm:text-sm">
                <t.icon size={14} /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Tab 1: Page Info */}
          <TabsContent value="info">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Landing Page Title *</Label>
                <Input value={form.title} onChange={(e) => updateField("title", e.target.value)} placeholder="Join Our Exclusive Business Session" />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">{window.location.origin}/l/</span>
                  <Input value={form.slug} onChange={(e) => { setSlugEdited(true); updateField("slug", e.target.value); }} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Short Description</Label>
                <Textarea value={form.description} onChange={(e) => updateField("description", e.target.value)} rows={3} placeholder="A brief description shown below the title" />
              </div>
            </Card>
          </TabsContent>

          {/* Tab 2: Page Design */}
          <TabsContent value="design">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Background Style</Label>
                <Select value={form.background_style} onValueChange={(v) => updateField("background_style", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Theme Color</Label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.theme_color} onChange={(e) => updateField("theme_color", e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={form.theme_color} onChange={(e) => updateField("theme_color", e.target.value)} className="w-32" />
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Page Sections</h3>
                </div>
                {form.sections.map((section, i) => (
                  <Card key={i} className="p-4 space-y-3">
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
                        <Input placeholder="Headline" value={section.headline || ""} onChange={(e) => updateSection(i, { headline: e.target.value })} />
                        <Input placeholder="Subheadline" value={section.subheadline || ""} onChange={(e) => updateSection(i, { subheadline: e.target.value })} />
                        <Input placeholder="Hero image URL" value={section.image_url || ""} onChange={(e) => updateSection(i, { image_url: e.target.value })} />
                        <Input placeholder="CTA text above form" value={section.cta_text || ""} onChange={(e) => updateSection(i, { cta_text: e.target.value })} />
                      </div>
                    )}
                    {section.type === "text" && (
                      <div className="space-y-3">
                        <Input placeholder="Heading" value={section.heading || ""} onChange={(e) => updateSection(i, { heading: e.target.value })} />
                        <Textarea placeholder="Body text" value={section.body || ""} onChange={(e) => updateSection(i, { body: e.target.value })} rows={4} />
                      </div>
                    )}
                    {section.type === "features" && (
                      <div className="space-y-3">
                        <Input placeholder="Section title" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} />
                        {(section.items || []).map((item: any, j: number) => (
                          <div key={j} className="flex items-center gap-2">
                            <Input className="w-14" value={item.emoji} onChange={(e) => {
                              const items = [...section.items]; items[j] = { ...item, emoji: e.target.value };
                              updateSection(i, { items });
                            }} />
                            <Input className="flex-1" placeholder="Benefit..." value={item.text} onChange={(e) => {
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
                        <Input placeholder="Section title" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} />
                        {(section.items || []).map((item: any, j: number) => (
                          <div key={j} className="space-y-2 border rounded-lg p-3">
                            <Input placeholder="Question" value={item.question} onChange={(e) => {
                              const items = [...section.items]; items[j] = { ...item, question: e.target.value };
                              updateSection(i, { items });
                            }} />
                            <Textarea placeholder="Answer" value={item.answer} onChange={(e) => {
                              const items = [...section.items]; items[j] = { ...item, answer: e.target.value };
                              updateSection(i, { items });
                            }} rows={2} />
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
                        <Input placeholder="Section title" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} />
                        {(section.items || []).map((item: any, j: number) => (
                          <div key={j} className="space-y-2 border rounded-lg p-3">
                            <Input placeholder="Name" value={item.name} onChange={(e) => {
                              const items = [...section.items]; items[j] = { ...item, name: e.target.value };
                              updateSection(i, { items });
                            }} />
                            <Input placeholder="Role" value={item.role} onChange={(e) => {
                              const items = [...section.items]; items[j] = { ...item, role: e.target.value };
                              updateSection(i, { items });
                            }} />
                            <Textarea placeholder="Quote" value={item.quote} onChange={(e) => {
                              const items = [...section.items]; items[j] = { ...item, quote: e.target.value };
                              updateSection(i, { items });
                            }} rows={2} />
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => updateSection(i, { items: [...(section.items || []), { name: "", role: "", quote: "" }] })}>
                          <Plus size={12} className="mr-1" /> Add Testimonial
                        </Button>
                      </div>
                    )}
                    {section.type === "speaker" && (
                      <div className="space-y-3">
                        <Input placeholder="Speaker name" value={section.name || ""} onChange={(e) => updateSection(i, { name: e.target.value })} />
                        <Input placeholder="Title / Role" value={section.title || ""} onChange={(e) => updateSection(i, { title: e.target.value })} />
                        <Input placeholder="Photo URL" value={section.photo_url || ""} onChange={(e) => updateSection(i, { photo_url: e.target.value })} />
                        <Textarea placeholder="Bio" value={section.bio || ""} onChange={(e) => updateSection(i, { bio: e.target.value })} rows={3} />
                      </div>
                    )}
                    {section.type === "image" && (
                      <div className="space-y-3">
                        <Input placeholder="Image URL" value={section.url || ""} onChange={(e) => updateSection(i, { url: e.target.value })} />
                        <Input placeholder="Caption (optional)" value={section.caption || ""} onChange={(e) => updateSection(i, { caption: e.target.value })} />
                      </div>
                    )}
                  </Card>
                ))}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {sectionTypes.map((st) => (
                    <Button key={st.type} variant="outline" size="sm" onClick={() => addSection(st.type)} className="justify-start text-xs">
                      <span className="mr-1">{st.icon}</span> {st.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 3: Registration Form */}
          <TabsContent value="form">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Form Title</Label>
                <Input value={form.form_title} onChange={(e) => updateField("form_title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Form Subtitle</Label>
                <Input value={form.form_subtitle} onChange={(e) => updateField("form_subtitle", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Submit Button Text</Label>
                <Input value={form.form_button_text} onChange={(e) => updateField("form_button_text", e.target.value)} />
              </div>

              <div className="border-t pt-5 space-y-4">
                <h3 className="font-semibold">Form Fields</h3>
                {formFields.map((f) => {
                  const enabledKey = `field_${f.key}_enabled` as keyof typeof form;
                  const requiredKey = `field_${f.key}_required` as keyof typeof form;
                  return (
                    <div key={f.key} className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-3">
                        <Switch checked={form[enabledKey] as boolean} onCheckedChange={(v) => updateField(enabledKey, v)} />
                        <span className={!(form[enabledKey] as boolean) ? "text-muted-foreground" : ""}>{f.label}</span>
                      </div>
                      {form[enabledKey] as boolean && (
                        <div className="flex items-center gap-2 text-sm">
                          <Switch checked={form[requiredKey] as boolean} onCheckedChange={(v) => updateField(requiredKey, v)} />
                          <span className="text-muted-foreground">Required</span>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom fields */}
                {[1, 2].map((n) => {
                  const enabledKey = `field_custom_${n}_enabled` as keyof typeof form;
                  const labelKey = `field_custom_${n}_label` as keyof typeof form;
                  const requiredKey = `field_custom_${n}_required` as keyof typeof form;
                  return (
                    <div key={n} className="space-y-2 border-b pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch checked={form[enabledKey] as boolean} onCheckedChange={(v) => updateField(enabledKey, v)} />
                          <span>Custom Field {n}</span>
                        </div>
                        {form[enabledKey] as boolean && (
                          <div className="flex items-center gap-2 text-sm">
                            <Switch checked={form[requiredKey] as boolean} onCheckedChange={(v) => updateField(requiredKey, v)} />
                            <span className="text-muted-foreground">Required</span>
                          </div>
                        )}
                      </div>
                      {form[enabledKey] as boolean && (
                        <Input placeholder="Field label..." value={form[labelKey] as string} onChange={(e) => updateField(labelKey, e.target.value)} className="ml-12" />
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Confirmation Email */}
          <TabsContent value="email">
            <Card className="p-6 space-y-5">
              <div className="flex items-center gap-3">
                <Switch checked={form.send_confirmation_email} onCheckedChange={(v) => updateField("send_confirmation_email", v)} />
                <Label>Send confirmation email after registration</Label>
              </div>
              {form.send_confirmation_email && (
                <>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input value={form.email_subject} onChange={(e) => updateField("email_subject", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Heading</Label>
                    <Input value={form.email_heading} onChange={(e) => updateField("email_heading", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea value={form.email_body} onChange={(e) => updateField("email_body", e.target.value)} rows={6} />
                    <p className="text-xs text-muted-foreground">
                      Variables: {"{{name}}"}, {"{{email}}"}, {"{{phone}}"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Footer</Label>
                    <Input value={form.email_footer_text} onChange={(e) => updateField("email_footer_text", e.target.value)} />
                  </div>
                </>
              )}
            </Card>
          </TabsContent>

          {/* Tab 5: Post-Submit Video */}
          <TabsContent value="video">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Post-Submit Video</Label>
                <Select value={form.post_submit_video_asset_id || ""} onValueChange={(v) => updateField("post_submit_video_asset_id", v || null)}>
                  <SelectTrigger><SelectValue placeholder="Select a video..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {videos.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Video Title</Label>
                <Input value={form.post_submit_video_title} onChange={(e) => updateField("post_submit_video_title", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Video Description</Label>
                <Textarea value={form.post_submit_video_description} onChange={(e) => updateField("post_submit_video_description", e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Link to Funnel (after video)</Label>
                <Select value={form.linked_funnel_id || ""} onValueChange={(v) => updateField("linked_funnel_id", v || null)}>
                  <SelectTrigger><SelectValue placeholder="No linked funnel" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {funnels.map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 6: Links & Auth */}
          <TabsContent value="links">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Landing Page URL</Label>
                <div className="flex items-center gap-2">
                  <Input readOnly value={`${window.location.origin}/l/${form.slug}`} />
                  <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/l/${form.slug}`); toast.success("Copied!"); }}>
                    <Link2 size={14} />
                  </Button>
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <h3 className="font-semibold">Authentication</h3>
                <div className="flex items-center gap-3">
                  <Switch checked={form.allow_login} onCheckedChange={(v) => updateField("allow_login", v)} />
                  <Label>Show Login button</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={form.allow_signup} onCheckedChange={(v) => updateField("allow_signup", v)} />
                  <Label>Show Sign Up button</Label>
                </div>
              </div>

              <div className="border-t pt-5 space-y-4">
                <h3 className="font-semibold">SEO / Social</h3>
                <div className="space-y-2">
                  <Label>OG Title</Label>
                  <Input value={form.og_title || ""} onChange={(e) => updateField("og_title", e.target.value)} placeholder={form.title} />
                </div>
                <div className="space-y-2">
                  <Label>OG Description</Label>
                  <Textarea value={form.og_description || ""} onChange={(e) => updateField("og_description", e.target.value)} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label>OG Image URL</Label>
                  <Input value={form.og_image_url || ""} onChange={(e) => updateField("og_image_url", e.target.value)} />
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 7: Publish */}
          <TabsContent value="publish">
            <Card className="p-6 space-y-5">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => updateField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-5 space-y-3">
                <h3 className="font-semibold">Publish Checklist</h3>
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
                onClick={() => {
                  updateField("status", "published");
                  setTimeout(() => saveMutation.mutate(), 100);
                }}
                disabled={!form.title || saveMutation.isPending}
              >
                <Rocket size={16} className="mr-2" /> Publish Landing Page
              </Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default LandingPageEditor;
