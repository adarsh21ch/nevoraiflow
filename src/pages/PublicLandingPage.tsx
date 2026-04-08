import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/landing/Logo";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Loader2, Check, Lock, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const PublicLandingPage = () => {
  const { slug } = useParams();
  const { user, signIn, signUp } = useAuth();
  const [page, setPage] = useState<any>(null);
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [authModal, setAuthModal] = useState<"login" | "signup" | null>(null);
  const [authForm, setAuthForm] = useState({ email: "", password: "", name: "", phone: "" });
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      const { data } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (data) {
        setPage(data);
        // Check localStorage
        const saved = localStorage.getItem(`nf_registered_${data.id}`);
        if (saved) setSubmitted(true);
        // Fetch video
        if (data.post_submit_video_asset_id) {
          const { data: v } = await supabase
            .from("video_assets")
            .select("id,title,public_url,thumbnail_url")
            .eq("id", data.post_submit_video_asset_id)
            .single();
          if (v) setVideo(v);
        }
        // Increment views
        supabase.rpc("increment_landing_page_views", { _landing_page_id: data.id });
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page || submitting) return;
    if (honeypot) { setSubmitted(true); return; } // Bot

    setSubmitting(true);
    try {
      const payload: any = {
        landing_page_id: page.id,
        owner_id: page.owner_id,
        ...formData,
        device_type: /Mobi/i.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent,
        user_id: user?.id || null,
      };

      const { error } = await supabase.from("landing_page_registrations").insert(payload);
      if (error) throw error;

      // Update count
      await supabase.from("landing_pages").update({
        total_registrations: (page.total_registrations || 0) + 1,
      } as any).eq("id", page.id);

      localStorage.setItem(`nf_registered_${page.id}`, JSON.stringify({
        name: formData.name, email: formData.email, submittedAt: Date.now(),
      }));

      setShowSuccess(true);
      setTimeout(() => { setShowSuccess(false); setSubmitted(true); }, 2000);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuth = async (type: "login" | "signup") => {
    setAuthLoading(true);
    try {
      if (type === "login") {
        const { error } = await signIn(authForm.email, authForm.password);
        if (error) throw error;
        toast.success("Logged in!");
      } else {
        const { error } = await signUp(authForm.email, authForm.password, authForm.name, authForm.phone);
        if (error) throw error;
        toast.success("Account created! Check your email to verify.");
      }
      setAuthModal(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
          <p className="text-muted-foreground">This landing page doesn't exist or isn't published.</p>
        </div>
      </div>
    );
  }

  const sections = (page.sections as any[]) || [];
  const bgClass = page.background_style === "light"
    ? "bg-background text-foreground"
    : page.background_style === "gradient"
    ? "bg-gradient-to-br from-background to-muted text-foreground"
    : "bg-card text-card-foreground";

  const formFields = [
    { key: "name", label: "Full Name", enabled: page.field_name_enabled, required: page.field_name_required },
    { key: "phone", label: "Phone Number", enabled: page.field_phone_enabled, required: page.field_phone_required, prefix: "+91" },
    { key: "email", label: "Email Address", enabled: page.field_email_enabled, required: page.field_email_required, type: "email" },
    { key: "age", label: "Age", enabled: page.field_age_enabled, required: page.field_age_required },
    { key: "city", label: "City", enabled: page.field_city_enabled, required: page.field_city_required },
    { key: "state", label: "State", enabled: page.field_state_enabled, required: page.field_state_required },
    { key: "occupation", label: "Occupation", enabled: page.field_occupation_enabled, required: page.field_occupation_required },
    ...(page.field_custom_1_enabled ? [{ key: "custom_1_value", label: page.field_custom_1_label || "Custom 1", enabled: true, required: page.field_custom_1_required }] : []),
    ...(page.field_custom_2_enabled ? [{ key: "custom_2_value", label: page.field_custom_2_label || "Custom 2", enabled: true, required: page.field_custom_2_required }] : []),
  ].filter((f) => f.enabled);

  // Render sections
  const renderSection = (section: any, i: number) => {
    switch (section.type) {
      case "hero":
        return (
          <div key={i} className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-bold leading-tight">{section.headline}</h1>
            {section.subheadline && <p className="text-lg text-muted-foreground">{section.subheadline}</p>}
            {section.image_url && <img src={section.image_url} alt="" className="rounded-xl w-full max-h-80 object-cover" />}
            {section.cta_text && (
              <p className="text-primary font-semibold text-lg">{section.cta_text}</p>
            )}
          </div>
        );
      case "text":
        return (
          <div key={i} className={`space-y-2 ${section.alignment === "center" ? "text-center" : ""}`}>
            {section.heading && <h2 className="text-2xl font-bold">{section.heading}</h2>}
            {section.body && <p className="text-muted-foreground whitespace-pre-line">{section.body}</p>}
          </div>
        );
      case "features":
        return (
          <div key={i} className="space-y-4">
            {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
            <div className={section.layout === "grid" ? "grid grid-cols-2 gap-3" : "space-y-2"}>
              {(section.items || []).map((item: any, j: number) => (
                <div key={j} className="flex items-start gap-2">
                  <span className="text-lg">{item.emoji}</span>
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        );
      case "testimonials":
        return (
          <div key={i} className="space-y-4">
            {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
            <div className="grid gap-4 md:grid-cols-2">
              {(section.items || []).map((item: any, j: number) => (
                <Card key={j} className="p-4">
                  <p className="italic text-muted-foreground mb-3">"{item.quote}"</p>
                  <div className="font-semibold">{item.name}</div>
                  {item.role && <div className="text-xs text-muted-foreground">{item.role}</div>}
                </Card>
              ))}
            </div>
          </div>
        );
      case "faq":
        return (
          <div key={i} className="space-y-4">
            {section.title && <h2 className="text-2xl font-bold">{section.title}</h2>}
            <Accordion type="single" collapsible className="w-full">
              {(section.items || []).map((item: any, j: number) => (
                <AccordionItem key={j} value={`faq-${i}-${j}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        );
      case "speaker":
        return (
          <Card key={i} className="p-6 flex flex-col sm:flex-row gap-4 items-center">
            {section.photo_url && (
              <img src={section.photo_url} alt={section.name} className="w-24 h-24 rounded-full object-cover" />
            )}
            <div>
              <h3 className="text-xl font-bold">{section.name}</h3>
              {section.title && <p className="text-sm text-muted-foreground">{section.title}</p>}
              {section.bio && <p className="mt-2 text-sm">{section.bio}</p>}
            </div>
          </Card>
        );
      case "image":
        return (
          <div key={i} className={section.size === "full" ? "" : "max-w-lg mx-auto"}>
            {section.url && <img src={section.url} alt={section.caption || ""} className="rounded-xl w-full" />}
            {section.caption && <p className="text-xs text-muted-foreground text-center mt-2">{section.caption}</p>}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${bgClass}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <Logo size="sm" />
        <div className="flex gap-2">
          {page.allow_login && !user && (
            <Button variant="ghost" size="sm" onClick={() => setAuthModal("login")}>Login</Button>
          )}
          {page.allow_signup && !user && (
            <Button size="sm" onClick={() => setAuthModal("signup")}>Sign Up</Button>
          )}
          {user && <span className="text-sm text-muted-foreground">{user.email}</span>}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 md:px-8 py-8 max-w-7xl mx-auto w-full">
        {showSuccess ? (
          <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Check className="text-primary" size={32} />
              </div>
              <h2 className="text-2xl font-bold">You're registered!</h2>
              <p className="text-muted-foreground">Check your email for confirmation.</p>
            </div>
          </div>
        ) : submitted ? (
          /* Post-submit: video */
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{page.post_submit_video_title}</h2>
              {page.post_submit_video_description && (
                <p className="text-muted-foreground">{page.post_submit_video_description}</p>
              )}
            </div>
            {video?.public_url ? (
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <video
                  src={video.public_url}
                  controls
                  className="w-full h-full"
                  poster={video.thumbnail_url || undefined}
                />
              </div>
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Thank you for registering! Stay tuned.</p>
              </Card>
            )}
            {page.linked_funnel_id && (
              <Button
                className="w-full"
                onClick={() => window.location.href = `/f/${page.linked_funnel_id}`}
              >
                Continue to full session journey <ChevronRight size={16} className="ml-1" />
              </Button>
            )}
          </div>
        ) : (
          /* Registration state */
          <div className="grid lg:grid-cols-5 gap-8 items-start">
            {/* Left: sections */}
            <div className="lg:col-span-3 space-y-8">
              {sections.map(renderSection)}
              {sections.length === 0 && (
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold">{page.title}</h1>
                  {page.description && <p className="text-lg text-muted-foreground">{page.description}</p>}
                </div>
              )}
            </div>

            {/* Right: registration form */}
            <div className="lg:col-span-2 lg:sticky lg:top-8">
              <Card className="p-6 space-y-5">
                <div>
                  <h3 className="text-lg font-bold">{page.form_title}</h3>
                  <p className="text-sm text-muted-foreground">{page.form_subtitle}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Honeypot */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="absolute opacity-0 h-0 w-0 pointer-events-none"
                    tabIndex={-1}
                    autoComplete="off"
                  />

                  {formFields.map((f) => (
                    <div key={f.key} className="space-y-1.5">
                      <Label>{f.label} {f.required && <span className="text-destructive">*</span>}</Label>
                      <Input
                        type={(f as any).type || "text"}
                        placeholder={(f as any).prefix ? `${(f as any).prefix} ` : ""}
                        value={formData[f.key] || ""}
                        onChange={(e) => setFormData((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        required={f.required}
                      />
                    </div>
                  ))}

                  <Button type="submit" className="w-full" disabled={submitting} style={{ backgroundColor: page.theme_color }}>
                    {submitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                    {page.form_button_text} →
                  </Button>
                </form>

                {page.allow_login && !user && (
                  <div className="text-center text-sm text-muted-foreground border-t pt-4">
                    Already registered?{" "}
                    <button onClick={() => setAuthModal("login")} className="text-primary hover:underline">
                      Login here
                    </button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
                  <Lock size={12} /> Your information is safe with us
                </p>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-muted-foreground border-t border-border">
        © Nevora Flow · Powered by Nevora
      </footer>

      {/* Auth Modal */}
      <Dialog open={!!authModal} onOpenChange={() => setAuthModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{authModal === "login" ? "Login" : "Sign Up"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {authModal === "signup" && (
              <>
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input value={authForm.name} onChange={(e) => setAuthForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={authForm.phone} onChange={(e) => setAuthForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
              </>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={authForm.email} onChange={(e) => setAuthForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" value={authForm.password} onChange={(e) => setAuthForm((p) => ({ ...p, password: e.target.value }))} />
            </div>
            <Button className="w-full" onClick={() => handleAuth(authModal!)} disabled={authLoading}>
              {authLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
              {authModal === "login" ? "Login" : "Create Account"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              {authModal === "login" ? (
                <>Don't have an account?{" "}<button onClick={() => setAuthModal("signup")} className="text-primary hover:underline">Sign Up</button></>
              ) : (
                <>Already have an account?{" "}<button onClick={() => setAuthModal("login")} className="text-primary hover:underline">Login</button></>
              )}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicLandingPage;
