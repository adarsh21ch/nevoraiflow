import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Play, MessageCircle, Phone as PhoneIcon, Lock, Upload, Check } from "lucide-react";

const PublicFunnel = () => {
  const { slug } = useParams();
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", city: "", custom_value: "" });
  const [paymentProof, setPaymentProof] = useState({ upi_transaction_id: "", amount: 0 });
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);

  const { data: funnel, isLoading } = useQuery({
    queryKey: ["public-funnel", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("funnels").select("*").eq("slug", slug!).eq("is_published", true).single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: formConfig } = useQuery({
    queryKey: ["public-funnel-form", funnel?.id],
    queryFn: async () => {
      const { data } = await supabase.from("funnel_lead_form_config").select("*").eq("funnel_id", funnel!.id).single();
      return data;
    },
    enabled: !!funnel?.id,
  });

  const { data: priceOptions = [] } = useQuery({
    queryKey: ["public-funnel-prices", funnel?.id],
    queryFn: async () => {
      const { data } = await supabase.from("funnel_price_options").select("*").eq("funnel_id", funnel!.id).order("position");
      return data || [];
    },
    enabled: !!funnel?.id && funnel?.payment_enabled === true,
  });

  useEffect(() => {
    if (funnel?.cta_timing_seconds) {
      const timer = setTimeout(() => setShowCta(true), funnel.cta_timing_seconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [funnel?.cta_timing_seconds, playing]);

  const submitLead = useMutation({
    mutationFn: async () => {
      await supabase.from("funnel_leads").insert({
        funnel_id: funnel!.id,
        name: leadForm.name || null,
        phone: leadForm.phone || null,
        email: leadForm.email || null,
        city: leadForm.city || null,
        custom_value: leadForm.custom_value || null,
        device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent,
      });
    },
    onSuccess: () => {
      setLeadSubmitted(true);
      toast.success("Thank you! Your details have been submitted.");
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  const submitPayment = useMutation({
    mutationFn: async () => {
      await supabase.from("funnel_payments").insert({
        funnel_id: funnel!.id,
        amount: paymentProof.amount || priceOptions[0]?.amount || 0,
        upi_transaction_id: paymentProof.upi_transaction_id || null,
        payment_type: "upi_manual",
      });
    },
    onSuccess: () => {
      setPaymentSubmitted(true);
      toast.success("Payment proof submitted! It will be verified shortly.");
    },
  });

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!funnel) return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-heading font-bold mb-2">Funnel Not Found</h1>
        <p className="text-sm text-muted-foreground">This funnel doesn't exist or has been unpublished.</p>
      </div>
    </div>
  );

  // Password gate
  if (funnel.visibility === "password" && !passwordUnlocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass-card p-8 w-full max-w-sm text-center">
          <Lock size={32} className="text-primary mx-auto mb-4" />
          <h2 className="text-lg font-heading font-semibold mb-2">{funnel.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">This funnel is password protected.</p>
          <Input type="password" placeholder="Enter password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="bg-muted border-border mb-3" />
          <Button variant="hero" className="w-full" onClick={() => { setPasswordUnlocked(true); }}>Unlock</Button>
        </div>
      </div>
    );
  }

  const showLeadFormNow = formConfig?.capture_enabled && !leadSubmitted && formConfig.capture_timing === "before_video";
  const showLeadFormAfterCta = formConfig?.capture_enabled && !leadSubmitted && formConfig.capture_timing === "after_cta" && showCta;

  const LeadFormComponent = () => (
    <div className="glass-card p-6 w-full max-w-md mx-auto">
      <h3 className="text-lg font-heading font-semibold mb-1 text-center">{funnel.title}</h3>
      <p className="text-xs text-muted-foreground text-center mb-4">Fill in your details to continue</p>
      <form onSubmit={(e) => { e.preventDefault(); submitLead.mutate(); }} className="space-y-3">
        {formConfig?.show_name && <Input placeholder="Full Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required={formConfig.name_required || false} className="bg-muted border-border" />}
        {formConfig?.show_phone && <Input placeholder="Phone (+91...)" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} required={formConfig.phone_required || false} className="bg-muted border-border" />}
        {formConfig?.show_email && <Input type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} required={formConfig.email_required || false} className="bg-muted border-border" />}
        {formConfig?.show_city && <Input placeholder="City" value={leadForm.city} onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })} required={formConfig.city_required || false} className="bg-muted border-border" />}
        {formConfig?.show_custom && <Input placeholder={formConfig.custom_field_label || "Additional Info"} value={leadForm.custom_value} onChange={(e) => setLeadForm({ ...leadForm, custom_value: e.target.value })} required={formConfig.custom_required || false} className="bg-muted border-border" />}
        <Button variant="hero" className="w-full" disabled={submitLead.isPending}>
          {submitLead.isPending ? "Submitting..." : funnel.cta_text || "Get Started"}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Lead form before video */}
        {showLeadFormNow && <div className="mb-6"><LeadFormComponent /></div>}

        {/* Video Player */}
        {(!showLeadFormNow || leadSubmitted) && (
          <div className="relative aspect-video bg-card rounded-xl overflow-hidden mb-6 flex items-center justify-center">
            <div className="text-center">
              <button onClick={() => setPlaying(true)} className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-3 hover:scale-105 transition-transform">
                <Play size={28} className="ml-1" style={{ color: 'white' }} />
              </button>
              <p className="text-sm text-muted-foreground">Click to play video</p>
            </div>
          </div>
        )}

        {/* CTA Button */}
        {(showCta || !funnel.cta_timing_seconds) && leadSubmitted && (
          <div className="mb-6">
            <Button variant="hero" size="xl" className="w-full" onClick={() => funnel.cta_url ? window.open(funnel.cta_url, "_blank") : null}>
              {funnel.cta_text || "Get Started"}
            </Button>
          </div>
        )}

        {/* Lead form after CTA */}
        {showLeadFormAfterCta && <div className="mb-6"><LeadFormComponent /></div>}

        {/* Payment Section */}
        {funnel.payment_enabled && leadSubmitted && !paymentSubmitted && (
          <div className="glass-card p-6 mb-6">
            <h3 className="text-lg font-heading font-semibold mb-4">Complete Payment</h3>
            {priceOptions.length > 0 && (
              <div className="space-y-2 mb-4">
                {priceOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setPaymentProof({ ...paymentProof, amount: opt.amount })}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${paymentProof.amount === opt.amount ? "border-primary bg-primary/10" : "border-border bg-muted"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{opt.label}</span>
                      <span className="font-heading font-bold">₹{opt.amount.toLocaleString("en-IN")}</span>
                    </div>
                    {opt.description && <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>}
                  </button>
                ))}
              </div>
            )}
            {funnel.upi_id && (
              <div className="p-3 bg-muted rounded-lg mb-4">
                <Label className="text-xs text-muted-foreground">Pay via UPI</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-primary flex-1">{funnel.upi_id}</code>
                  <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(funnel.upi_id!); toast.success("UPI ID copied!"); }}>Copy</Button>
                </div>
              </div>
            )}
            {funnel.qr_code_url && <img src={funnel.qr_code_url} alt="QR Code" className="w-48 h-48 mx-auto mb-4 rounded-lg" />}
            {funnel.payment_instructions && <p className="text-sm text-muted-foreground mb-4">{funnel.payment_instructions}</p>}
            <div className="space-y-3">
              <Input placeholder="UPI Transaction ID (optional)" value={paymentProof.upi_transaction_id} onChange={(e) => setPaymentProof({ ...paymentProof, upi_transaction_id: e.target.value })} className="bg-muted border-border" />
              <Button variant="hero" className="w-full" onClick={() => submitPayment.mutate()} disabled={submitPayment.isPending}>
                {submitPayment.isPending ? "Submitting..." : "I've Made the Payment"}
              </Button>
            </div>
          </div>
        )}

        {paymentSubmitted && (
          <div className="glass-card p-6 text-center mb-6">
            <Check size={32} className="text-success mx-auto mb-3" />
            <h3 className="font-heading font-semibold">Payment Under Review</h3>
            <p className="text-sm text-muted-foreground mt-1">Your payment proof has been submitted. You'll be notified once it's verified.</p>
          </div>
        )}

        {/* Contact Buttons */}
        {funnel.show_contact_buttons && (leadSubmitted || !funnel.show_contact_after_cta) && (
          <div className="fixed bottom-0 left-0 right-0 p-4 glass-card border-t border-white/[0.06] flex gap-3 justify-center z-50">
            {funnel.contact_whatsapp && (
              <Button variant="default" className="bg-success hover:bg-success/90" onClick={() => window.open(`https://wa.me/${funnel.contact_whatsapp?.replace(/\D/g, "")}`)}>
                <MessageCircle size={16} /> WhatsApp
              </Button>
            )}
            {funnel.contact_phone && (
              <Button variant="default" onClick={() => window.open(`tel:${funnel.contact_phone}`)}>
                <PhoneIcon size={16} /> Call
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicFunnel;
