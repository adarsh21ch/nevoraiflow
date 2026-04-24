import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Info, Shield, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsAppSupport } from "@/hooks/useWhatsAppSupport";
import { useCallback, useState } from "react";
import { toast } from "sonner";

const VIEWS_TOOLTIP = "Total unique viewers across all your funnels per day. Resets at midnight IST.";

const freePlan = {
  name: "Free",
  features: [
    { text: "View shared funnels", included: true },
    { text: "Access public content", included: true },
    { text: "Browse marketplace", included: true },
    { text: "No funnel creation", included: false },
    { text: "No lead capture", included: false },
    { text: "No live broadcast", included: false },
  ],
  cta: "Start Free",
  variant: "outline" as const,
};

const formatStorage = (mb: number | null | undefined): string | null => {
  if (mb == null) return null;
  if (mb === -1) return "Unlimited storage";
  if (mb <= 0) return null;
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${gb % 1 === 0 ? gb : gb.toFixed(1)} GB storage`;
  }
  return `${mb} MB storage`;
};

const formatDailyViews = (limit: number | null | undefined): { text: string; tooltip: string } | null => {
  if (limit == null) return null;
  if (limit === -1) return { text: "Unlimited daily views", tooltip: VIEWS_TOOLTIP };
  if (limit <= 0) return null;
  return { text: `${limit.toLocaleString("en-IN")} views/day total`, tooltip: VIEWS_TOOLTIP };
};

const buildFeatures = (config: any) => {
  const features: { text: string; included: boolean; tooltip?: string }[] = [];

  // Funnels
  if (config.max_funnels === -1) features.push({ text: "Unlimited funnels", included: true });
  else if (config.max_funnels > 0) features.push({ text: `Up to ${config.max_funnels} funnels`, included: true });

  // Landing pages
  if (config.feature_landing_pages) {
    if (config.max_landing_pages === -1) features.push({ text: "Unlimited landing pages", included: true });
    else if (config.max_landing_pages > 0) features.push({ text: `Up to ${config.max_landing_pages} landing pages`, included: true });
  }

  // Live sessions
  if (config.feature_go_live) {
    if (config.max_live_sessions === -1) features.push({ text: "Unlimited live sessions", included: true });
    else if (config.max_live_sessions > 0) features.push({ text: `Up to ${config.max_live_sessions} live sessions`, included: true });
  }

  // Videos
  if (config.max_videos === -1) features.push({ text: "Unlimited video uploads", included: true });
  else if (config.max_videos > 0) features.push({ text: `Up to ${config.max_videos} video uploads`, included: true });

  // Storage
  const storageText = formatStorage(config.max_storage_mb);
  if (storageText) features.push({ text: storageText, included: true });

  // Daily views — always show with tooltip
  const dv = formatDailyViews(config.daily_view_limit);
  if (dv) features.push({ text: dv.text, included: true, tooltip: dv.tooltip });

  // Feature toggles
  features.push({ text: "Lead capture", included: !!config.feature_lead_capture });
  features.push({ text: "Analytics", included: !!config.feature_analytics });
  features.push({ text: "WhatsApp auto-message", included: !!config.feature_whatsapp_automation });
  features.push({ text: "Live broadcast", included: !!config.feature_go_live });

  if (config.feature_video_sharing) features.push({ text: "Video sharing", included: true });
  if (config.feature_advanced_analytics) features.push({ text: "Advanced analytics", included: true });
  if (config.feature_priority_support) features.push({ text: "Priority support", included: true });

  return features;
};

export const PricingSection = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { openSupport } = useWhatsAppSupport();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: planConfigs = [] } = useQuery({
    queryKey: ["plan-configs-landing"],
    queryFn: async () => {
      const { data } = await supabase.from("plan_config").select("*");
      return (data || []) as any[];
    },
    staleTime: 60_000,
  });

  const loadRazorpayScript = (): Promise<boolean> => new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePlanClick = useCallback(async (planName: string) => {
    if (planName === "Free") {
      navigate(user ? "/dashboard" : "/auth?tab=signup");
      return;
    }
    if (!user) {
      // After login, return user to /pricing where checkout opens via the same flow
      navigate(`/auth?tab=signup&redirect=/pricing&plan=${planName.toLowerCase()}`);
      return;
    }
    const config = planConfigs.find((c: any) => c.plan_name === planName.toLowerCase());
    if (!config) {
      toast.error("Plan not available right now.");
      return;
    }
    const planKey = `${planName.toLowerCase()}_monthly`;
    setLoadingPlan(planKey);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment gateway");
      const { data, error } = await supabase.functions.invoke("razorpay-portal", {
        body: { action: "create_order", amount: config.monthly_price, plan_key: planKey },
      });
      if (error || !data?.order_id) throw new Error(error?.message || "Failed to create order");

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "nFlow",
        description: `${planName} Plan — monthly`,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            const { error: verifyError } = await supabase.functions.invoke("razorpay-portal", {
              body: {
                action: "verify_payment",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_key: planKey,
              },
            });
            if (verifyError) throw verifyError;
            toast.success(`Payment successful! Welcome to ${planName} 🎉`, { duration: 6000 });
            setTimeout(() => navigate("/billing"), 1500);
          } catch {
            toast.error("Payment received but verification pending. Contact support.");
            openSupport(`Hi, my ${planName} payment was successful but access not unlocked. Payment ID: ${response.razorpay_payment_id}`);
          }
        },
        prefill: {
          name: profile?.full_name || "",
          email: user.email,
          contact: profile?.phone || "",
        },
        theme: { color: "#2563EB" },
        modal: { ondismiss: () => setLoadingPlan(null) },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setLoadingPlan(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoadingPlan(null);
    }
  }, [user, profile, planConfigs, navigate, openSupport]);


  const freeConfig = planConfigs.find((c: any) => c.plan_name === "free");
  const basicConfig = planConfigs.find((c: any) => c.plan_name === "basic");
  const proConfig = planConfigs.find((c: any) => c.plan_name === "pro");
  const basicEnabled = basicConfig?.is_enabled !== false && !!basicConfig;
  const proEnabled = proConfig?.is_enabled !== false && !!proConfig;

  const cards: {
    name: string;
    price: string;
    period: string;
    daily: string;
    badge: string | null;
    features: { text: string; included: boolean; tooltip?: string }[];
    cta: string;
    variant: "outline" | "default" | "hero";
    highlight: boolean;
  }[] = [];

  // Free card — merge static "explore" features with DB-driven daily views
  const freeFeatures: { text: string; included: boolean; tooltip?: string }[] = [...freePlan.features];
  const freeDv = formatDailyViews(freeConfig?.daily_view_limit);
  if (freeDv) {
    freeFeatures.splice(3, 0, { text: freeDv.text, included: true, tooltip: freeDv.tooltip });
  }

  cards.push({
    name: freePlan.name,
    price: "₹0",
    period: "",
    daily: "",
    badge: null,
    features: freeFeatures,
    cta: freePlan.cta,
    variant: freePlan.variant,
    highlight: false,
  });

  if (basicEnabled && basicConfig) {
    const price = basicConfig.monthly_price;
    const daily = price > 0 ? `Just ₹${Math.ceil(price / 30)}/day` : "";
    cards.push({
      name: "Basic",
      price: `₹${price.toLocaleString("en-IN")}`,
      period: "/month",
      daily,
      badge: basicConfig.plan_badge_text || null,
      features: buildFeatures(basicConfig),
      cta: "Get Basic",
      variant: "default",
      highlight: false,
    });
  }

  if (proEnabled && proConfig) {
    const price = proConfig.monthly_price;
    const daily = price > 0 ? `Just ₹${Math.ceil(price / 30)}/day` : "";
    cards.push({
      name: "Pro",
      price: `₹${price.toLocaleString("en-IN")}`,
      period: "/month",
      daily,
      badge: proConfig.plan_badge_text || "Most Popular",
      features: buildFeatures(proConfig),
      cta: "Go Pro",
      variant: "hero",
      highlight: true,
    });
  }

  // Enterprise card content (DB-driven)
  const { data: enterpriseConfig } = useQuery({
    queryKey: ["enterprise-plan-config-public"],
    queryFn: async () => {
      const { data } = await supabase
        .from("enterprise_plan_config" as any)
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      return data as any;
    },
    staleTime: 120_000, // 2-minute cache per spec
  });

  const enterpriseVisible = enterpriseConfig?.is_visible !== false;
  const enterpriseFeaturesRaw: { text: string; enabled: boolean }[] = Array.isArray(
    enterpriseConfig?.features,
  )
    ? enterpriseConfig.features
    : [];
  const enterpriseFeatures = enterpriseFeaturesRaw.filter((f) => f?.enabled && f?.text);

  const totalCards = cards.length + (enterpriseVisible ? 1 : 0);
  const gridCols =
    totalCards === 1
      ? "max-w-md mx-auto"
      : totalCards === 2
      ? "md:grid-cols-2 max-w-3xl mx-auto"
      : totalCards === 3
      ? "md:grid-cols-3 max-w-5xl mx-auto"
      : "md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto";

  return (
    <section id="pricing" className="py-24 relative">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start risk-free. 7-day money-back guarantee on all paid plans.
          </p>
        </motion.div>

        {/* Guarantee strip — sits above pricing cards so users see the safety net first */}
        <motion.div
          className="max-w-2xl mx-auto mb-10 flex items-center gap-3 sm:gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-emerald-500/[0.04] to-transparent px-4 sm:px-5 py-3.5"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
            <Shield className="text-emerald-500" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">
              7-Day Money-Back Guarantee
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Not happy within 7 days? We'll refund every rupee — no questions asked.
            </p>
          </div>
        </motion.div>

        <div className={`grid gap-6 ${gridCols}`}>
          {cards.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`glass-card p-6 relative flex flex-col ${
                plan.highlight ? "border-primary/40 glow-primary" : ""
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                {plan.daily && (
                  <p className="text-xs text-primary mt-1">{plan.daily}</p>
                )}
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-success shrink-0" />
                    ) : (
                      <X size={16} className="text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                      {f.text}
                    </span>
                    {(f as any).tooltip && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                              <Info size={11} />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[220px] text-xs">
                            {(f as any).tooltip}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </li>
                ))}
              </ul>
              <Link to={plan.name === "Free" ? "/auth?tab=signup" : "/pricing"}>
                <Button variant={plan.variant} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}

          {/* Enterprise card — DB-driven, always last, premium look */}
          {enterpriseVisible && (
            <motion.div
              className="relative flex flex-col p-6 rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/[0.06] via-background to-background shadow-[0_0_40px_-15px_rgba(245,158,11,0.4)]"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: cards.length * 0.1 }}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-yellow-500 text-xs font-semibold text-background flex items-center gap-1 whitespace-nowrap">
                <Crown size={12} /> {enterpriseConfig?.badge_text || "For Large Networks"}
              </div>
              <div className="mb-4">
                <h3 className="text-lg font-heading font-semibold mb-1">Enterprise</h3>
                <p className="text-[11px] text-amber-500 font-medium mb-3">
                  {enterpriseConfig?.subheading || "100+ active team members"}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">
                    ₹{(enterpriseConfig?.monthly_price ?? 5999).toLocaleString("en-IN")}
                  </span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                {enterpriseConfig?.price_note && (
                  <p className="text-xs text-amber-500 mt-1">{enterpriseConfig.price_note}</p>
                )}
                {enterpriseConfig?.show_setup_fee_note !== false &&
                  enterpriseConfig?.setup_fee_note && (
                    <p className="text-[11px] italic text-muted-foreground mt-1">
                      {enterpriseConfig.setup_fee_note}
                    </p>
                  )}
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {(enterpriseFeatures.length > 0
                  ? enterpriseFeatures
                  : [{ text: "Loading…", enabled: true }]
                ).map((f, idx) => (
                  <li key={`${f.text}-${idx}`} className="flex items-center gap-2 text-sm">
                    <Check size={16} className="text-amber-500 shrink-0" />
                    <span className="text-foreground">{f.text}</span>
                  </li>
                ))}
              </ul>
              <Link to="/enterprise">
                <Button
                  variant="outline"
                  className="w-full border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-500"
                >
                  {enterpriseConfig?.cta_text || "Book a Call"}
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
};
