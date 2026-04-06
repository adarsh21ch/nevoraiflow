import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Play, MessageCircle, Phone as PhoneIcon, Lock, Check, AlertTriangle, BadgeCheck, MapPin, Instagram } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoImg from "@/assets/logo.png";

const PublicFunnel = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [showCta, setShowCta] = useState(false);
  const [watchSeconds, setWatchSeconds] = useState(0);
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", city: "", custom_value: "" });
  const [paymentProof, setPaymentProof] = useState({ upi_transaction_id: "", amount: 0 });
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordUnlocked, setPasswordUnlocked] = useState(false);
  const maxTimeReached = useRef(0);

  // Fetch funnel
  const { data: funnel, isLoading } = useQuery({
    queryKey: ["public-funnel", slug],
    queryFn: async () => {
      const { data } = await supabase.from("funnels").select("*").eq("slug", slug!).single();
      if (!data) throw new Error("Not found");
      return data;
    },
    enabled: !!slug,
  });

  const isOwner = user && funnel && user.id === funnel.owner_id;
  const isDraft = funnel && !funnel.is_published;
  const canView = funnel && (funnel.is_published || isOwner);

  // Fetch video asset
  const { data: videoAsset } = useQuery({
    queryKey: ["funnel-video-asset", funnel?.video_asset_id],
    queryFn: async () => {
      const { data } = await supabase.from("video_assets").select("*").eq("id", funnel!.video_asset_id!).single();
      return data;
    },
    enabled: !!funnel?.video_asset_id,
  });

  // Fetch creator profile
  const { data: creatorProfile } = useQuery({
    queryKey: ["creator-profile", funnel?.owner_id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name, city, instagram_url, avatar_url, kyc_status").eq("id", funnel!.owner_id).single();
      return data;
    },
    enabled: !!funnel?.owner_id,
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

  // CTA timing
  useEffect(() => {
    if (!funnel || funnel.cta_enabled === false) return;
    if (funnel.cta_timing_seconds && playing) {
      const timer = setTimeout(() => setShowCta(true), funnel.cta_timing_seconds * 1000);
      return () => clearTimeout(timer);
    } else if (!funnel.cta_timing_seconds) {
      setShowCta(true);
    }
  }, [funnel, playing]);

  // Watch time tracker
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setWatchSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [playing]);

  // Set OG tags
  useEffect(() => {
    if (!funnel) return;
    document.title = `${funnel.title} | Nevorai`;
    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", funnel.description || funnel.title);
    setMeta("og:title", funnel.title, true);
    setMeta("og:description", funnel.description || funnel.title, true);
    setMeta("og:type", "website", true);
    setMeta("og:url", window.location.href, true);
    if (funnel.thumbnail_url) setMeta("og:image", funnel.thumbnail_url, true);
    setMeta("og:site_name", "Nevorai", true);
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", funnel.title);
    setMeta("twitter:description", funnel.description || funnel.title);
    if (funnel.thumbnail_url) setMeta("twitter:image", funnel.thumbnail_url);
  }, [funnel]);

  const submitLead = useMutation({
    mutationFn: async () => {
      await supabase.from("funnel_leads").insert({
        funnel_id: funnel!.id,
        name: leadForm.name || null, phone: leadForm.phone || null,
        email: leadForm.email || null, city: leadForm.city || null,
        custom_value: leadForm.custom_value || null,
        device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent,
      });
    },
    onSuccess: () => { setLeadSubmitted(true); toast.success("Thank you! Your details have been submitted."); },
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
    onSuccess: () => { setPaymentSubmitted(true); toast.success("Payment proof submitted!"); },
  });

  const handlePlayVideo = () => {
    setPlaying(true);
    setTimeout(() => videoRef.current?.play(), 100);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!canView) return (
    <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-xl font-heading font-bold mb-2 text-white">Funnel Not Found</h1>
        <p className="text-sm text-gray-400">This funnel doesn't exist or has been unpublished.</p>
      </div>
    </div>
  );

  // Password gate
  if (funnel.visibility === "password" && !passwordUnlocked) {
    return (
      <div className="min-h-screen bg-[#0a0d14] flex items-center justify-center p-4">
        <div className="bg-[#12151f] border border-[#2a3050] rounded-2xl p-8 w-full max-w-sm text-center">
          <Lock size={32} className="text-primary mx-auto mb-4" />
          <h2 className="text-lg font-heading font-semibold mb-2 text-white">{funnel.title}</h2>
          <p className="text-sm text-gray-400 mb-4">This funnel is password protected.</p>
          <Input type="password" placeholder="Enter password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="bg-[#1a1f2e] border-[#2a3050] text-white mb-3" />
          <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setPasswordUnlocked(true)}>Unlock</Button>
        </div>
      </div>
    );
  }

  const ctaEnabled = funnel.cta_enabled === true;
  const showLeadFormNow = formConfig?.capture_enabled && !leadSubmitted && formConfig.capture_timing === "before_video";
  const showLeadFormAfterCta = formConfig?.capture_enabled && !leadSubmitted && formConfig.capture_timing === "after_cta" && showCta;
  const videoUrl = videoAsset?.public_url;
  const ctaTimingLeft = funnel.cta_timing_seconds ? Math.max(0, funnel.cta_timing_seconds - watchSeconds) : 0;
  const isVerified = creatorProfile?.kyc_status === "approved";

  const LeadFormComponent = () => (
    <div className="bg-[#12151f] border border-[#2a3050] rounded-2xl p-6 w-full max-w-md mx-auto">
      <h3 className="text-lg font-heading font-semibold mb-1 text-center text-white">{funnel.title}</h3>
      <p className="text-xs text-gray-400 text-center mb-4">Fill in your details to continue</p>
      <form onSubmit={(e) => { e.preventDefault(); submitLead.mutate(); }} className="space-y-3">
        {formConfig?.show_name && <Input placeholder="Full Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required={formConfig.name_required || false} className="bg-[#1a1f2e] border-[#2a3050] text-white placeholder:text-gray-500" />}
        {formConfig?.show_phone && <Input placeholder="Phone (+91...)" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} required={formConfig.phone_required || false} className="bg-[#1a1f2e] border-[#2a3050] text-white placeholder:text-gray-500" />}
        {formConfig?.show_email && <Input type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} required={formConfig.email_required || false} className="bg-[#1a1f2e] border-[#2a3050] text-white placeholder:text-gray-500" />}
        {formConfig?.show_city && <Input placeholder="City" value={leadForm.city} onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })} required={formConfig.city_required || false} className="bg-[#1a1f2e] border-[#2a3050] text-white placeholder:text-gray-500" />}
        {formConfig?.show_custom && <Input placeholder={formConfig.custom_field_label || "Additional Info"} value={leadForm.custom_value} onChange={(e) => setLeadForm({ ...leadForm, custom_value: e.target.value })} required={formConfig.custom_required || false} className="bg-[#1a1f2e] border-[#2a3050] text-white placeholder:text-gray-500" />}
        <Button className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" disabled={submitLead.isPending}>
          {submitLead.isPending ? "Submitting..." : funnel.cta_text || "Get Started"}
        </Button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0d14]">
      {/* Draft banner */}
      {isDraft && isOwner && (
        <div className="bg-warning/10 border-b border-warning/20 px-4 py-2 text-center">
          <p className="text-sm text-warning flex items-center justify-center gap-2">
            <AlertTriangle size={14} /> This is a draft preview. Publish your funnel to share it.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#2a3050]/30">
        <div className="flex items-center gap-2">
          <img src={logoImg} alt="Nevorai" className="h-6 w-6" />
          <span className="text-xs text-gray-500">Powered by Nevorai</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white">{funnel.title}</h1>
          {funnel.description && <p className="text-sm text-gray-400 mt-2 max-w-lg mx-auto">{funnel.description}</p>}
        </div>

        {/* Lead form before video */}
        {showLeadFormNow && <LeadFormComponent />}

        {/* Video Player */}
        {(!showLeadFormNow || leadSubmitted) && (
          <div className="relative aspect-video bg-[#12151f] rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
            {videoUrl && playing ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-contain"
                controls
                playsInline
                controlsList={`${!funnel.allow_speed_change ? "nofullscreen" : ""}`}
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    const ct = videoRef.current.currentTime;
                    if (ct > maxTimeReached.current) maxTimeReached.current = ct;
                    setWatchSeconds(Math.floor(ct));
                  }
                }}
                onSeeking={() => {
                  if (funnel.allow_seek === false && videoRef.current) {
                    if (videoRef.current.currentTime > maxTimeReached.current + 1) {
                      videoRef.current.currentTime = maxTimeReached.current;
                    }
                  }
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center cursor-pointer" onClick={handlePlayVideo}>
                {funnel.thumbnail_url && <img src={funnel.thumbnail_url} alt="" className="absolute inset-0 w-full h-full object-cover" />}
                <div className="relative z-10">
                  <button className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center hover:scale-110 transition-transform shadow-lg shadow-primary/30">
                    <Play size={36} className="ml-1 text-white" />
                  </button>
                </div>
                {funnel.thumbnail_url && <div className="absolute inset-0 bg-black/30" />}
              </div>
            )}
          </div>
        )}

        {/* Creator Badge */}
        {creatorProfile && (
          <div className="flex items-center gap-3 bg-[#12151f] border border-[#2a3050] rounded-2xl p-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-primary font-heading font-bold text-sm">
              {creatorProfile.avatar_url ? (
                <img src={creatorProfile.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                creatorProfile.full_name?.charAt(0)?.toUpperCase() || "N"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-semibold text-white text-sm truncate">{creatorProfile.full_name}</span>
                {isVerified && <BadgeCheck size={16} className="text-primary flex-shrink-0" />}
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                {creatorProfile.city && (
                  <span className="flex items-center gap-1"><MapPin size={10} /> {creatorProfile.city}</span>
                )}
                {creatorProfile.instagram_url && (
                  <a href={creatorProfile.instagram_url.startsWith("http") ? creatorProfile.instagram_url : `https://instagram.com/${creatorProfile.instagram_url.replace("@", "")}`}
                    target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                    <Instagram size={10} /> @{creatorProfile.instagram_url.replace(/.*instagram\.com\//, "").replace("@", "")}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CTA Button — only when explicitly enabled */}
        {ctaEnabled && (showCta || !funnel.cta_timing_seconds) && (!showLeadFormNow || leadSubmitted) && (
          <div>
            <Button
              className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20"
              onClick={() => funnel.cta_url ? window.open(funnel.cta_url, "_blank") : null}
            >
              {funnel.cta_text || "Get Started"} →
            </Button>
          </div>
        )}

        {/* Locked CTA countdown */}
        {ctaEnabled && funnel.lock_cta && !showCta && playing && (
          <div className="text-center">
            <Button disabled className="w-full h-14 text-base rounded-xl bg-gray-700 text-gray-400 cursor-not-allowed">
              🔒 Watch the video to unlock · {Math.floor(ctaTimingLeft / 60)}:{(ctaTimingLeft % 60).toString().padStart(2, "0")}
            </Button>
          </div>
        )}

        {/* Lead form after CTA */}
        {showLeadFormAfterCta && <LeadFormComponent />}

        {/* Payment Section */}
        {funnel.payment_enabled && leadSubmitted && !paymentSubmitted && (
          <div className="bg-[#12151f] border border-[#2a3050] rounded-2xl p-6">
            <h3 className="text-lg font-heading font-semibold mb-4 text-white">Complete Payment</h3>
            {priceOptions.length > 0 && (
              <div className="space-y-2 mb-4">
                {priceOptions.map((opt) => (
                  <button key={opt.id} onClick={() => setPaymentProof({ ...paymentProof, amount: opt.amount })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${paymentProof.amount === opt.amount ? "border-primary bg-primary/10" : "border-[#2a3050] bg-[#1a1f2e]"}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-white">{opt.label}</span>
                      <span className="font-heading font-bold text-white">₹{opt.amount.toLocaleString("en-IN")}</span>
                    </div>
                    {opt.description && <p className="text-xs text-gray-400 mt-1">{opt.description}</p>}
                  </button>
                ))}
              </div>
            )}
            {funnel.upi_id && (
              <div className="p-3 bg-[#1a1f2e] rounded-xl mb-4">
                <Label className="text-xs text-gray-400">Pay via UPI</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-sm text-primary flex-1">{funnel.upi_id}</code>
                  <Button variant="ghost" size="sm" className="text-gray-300" onClick={() => { navigator.clipboard.writeText(funnel.upi_id!); toast.success("UPI ID copied!"); }}>Copy</Button>
                </div>
              </div>
            )}
            {funnel.qr_code_url && <img src={funnel.qr_code_url} alt="QR Code" className="w-48 h-48 mx-auto mb-4 rounded-xl" />}
            {funnel.payment_instructions && <p className="text-sm text-gray-400 mb-4">{funnel.payment_instructions}</p>}
            <div className="space-y-3">
              <Input placeholder="UPI Transaction ID (optional)" value={paymentProof.upi_transaction_id} onChange={(e) => setPaymentProof({ ...paymentProof, upi_transaction_id: e.target.value })} className="bg-[#1a1f2e] border-[#2a3050] text-white" />
              <Button className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => submitPayment.mutate()} disabled={submitPayment.isPending}>
                {submitPayment.isPending ? "Submitting..." : "I've Made the Payment"}
              </Button>
            </div>
          </div>
        )}

        {paymentSubmitted && (
          <div className="bg-[#12151f] border border-[#2a3050] rounded-2xl p-6 text-center">
            <Check size={32} className="text-success mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-white">Payment Under Review</h3>
            <p className="text-sm text-gray-400 mt-1">Your payment proof has been submitted. You'll be notified once it's verified.</p>
          </div>
        )}

        {/* Contact Buttons */}
        {funnel.show_contact_buttons && (leadSubmitted || !funnel.show_contact_after_cta) && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#12151f]/95 backdrop-blur-xl border-t border-[#2a3050] flex gap-3 justify-center z-50">
            {funnel.contact_whatsapp && (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(`https://wa.me/${funnel.contact_whatsapp?.replace(/\D/g, "")}`)}>
                <MessageCircle size={16} /> WhatsApp
              </Button>
            )}
            {funnel.contact_phone && (
              <Button className="bg-[#2a3050] hover:bg-[#343a50] text-white" onClick={() => window.open(`tel:${funnel.contact_phone}`)}>
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
