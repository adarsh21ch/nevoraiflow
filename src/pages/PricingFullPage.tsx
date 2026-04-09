import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Shield, ArrowRight, Loader2, Users, User, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useWhatsAppSupport } from "@/hooks/useWhatsAppSupport";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { PlanConfig } from "@/hooks/usePlanLimits";

declare global {
  interface Window { Razorpay: any; }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PricingFullPage = () => {
  const { user, profile } = useAuth();
  const { plan, refreshPlan } = usePlan();
  const { openSupport } = useWhatsAppSupport();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");

  // Fetch plan configs from plan_config table
  const { data: planConfigs = [] } = useQuery({
    queryKey: ["plan-configs"],
    queryFn: async () => {
      const { data } = await supabase.from("plan_config").select("*");
      return (data || []) as PlanConfig[];
    },
    staleTime: 60000,
  });

  const basicConfig = planConfigs.find(c => c.plan_name === "basic");
  const proConfig = planConfigs.find(c => c.plan_name === "pro");

  const getPrice = (config: PlanConfig | undefined) => {
    if (!config) return 0;
    return billing === "monthly" ? config.monthly_price : config.yearly_price;
  };

  const getSavings = (config: PlanConfig | undefined) => {
    if (!config) return 0;
    return config.monthly_price * 12 - config.yearly_price;
  };

  const handlePayment = useCallback(async (planName: string) => {
    if (!user) {
      navigate("/auth?tab=signup&redirect=/pricing");
      return;
    }
    const config = planConfigs.find(c => c.plan_name === planName);
    if (!config) return;

    const amount = billing === "monthly" ? config.monthly_price : config.yearly_price;
    const planKey = `${planName}_${billing}`;

    setLoading(planKey);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load payment gateway");

      const { data, error } = await supabase.functions.invoke("razorpay-portal", {
        body: { action: "create_order", amount, plan_key: planKey },
      });
      if (error || !data?.order_id) throw new Error(error?.message || "Failed to create order");

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Nevorai Flow",
        description: `${planName.charAt(0).toUpperCase() + planName.slice(1)} Plan — ${billing}`,
        order_id: data.order_id,
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-portal", {
              body: {
                action: "verify_payment",
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_key: planKey,
              },
            });
            if (verifyError) throw verifyError;
            toast.success(`Payment successful! Welcome to ${planName.charAt(0).toUpperCase() + planName.slice(1)} 🎉`);
            refreshPlan();
            setTimeout(() => navigate("/dashboard"), 1500);
          } catch {
            toast.error("Payment received but verification pending. Contact support.");
            openSupport("Hi, my payment was successful but access not unlocked. Payment ID: " + response.razorpay_payment_id);
          }
        },
        prefill: {
          name: profile?.full_name || "",
          email: user.email,
          contact: profile?.phone || "",
        },
        theme: { color: "#2563EB" },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again or use a different payment method.");
        setLoading(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(null);
    }
  }, [user, profile, navigate, openSupport, refreshPlan, billing, planConfigs]);

  const isCurrentTier = (t: string) => plan.isPaid && plan.tier === t && !plan.isExpired;

  const limitDisplay = (val: number) => val === -1 ? "Unlimited" : String(val);

  const comparisonFeatures = [
    { name: "Funnels", free: "0 (view only)", basic: limitDisplay(basicConfig?.max_funnels || 3), pro: limitDisplay(proConfig?.max_funnels || 10) },
    { name: "Landing Pages", free: "0", basic: limitDisplay(basicConfig?.max_landing_pages || 2), pro: limitDisplay(proConfig?.max_landing_pages || 5) },
    { name: "Live Sessions", free: "0", basic: limitDisplay(basicConfig?.max_live_sessions || 1), pro: limitDisplay(proConfig?.max_live_sessions || 5) },
    { name: "Multi-level Funnels", free: false, basic: basicConfig?.multilevel_funnel_enabled || false, pro: proConfig?.multilevel_funnel_enabled || true },
    { name: "Team Members", free: false, basic: false, pro: proConfig?.max_team_members === -1 ? true : `Up to ${proConfig?.max_team_members || 10}` },
    { name: "Lead Capture", free: false, basic: true, pro: true },
    { name: "Analytics", free: false, basic: "Basic", pro: "Advanced" },
    { name: "WhatsApp Automation", free: false, basic: true, pro: true },
    { name: "Video Sharing", free: false, basic: false, pro: true },
    { name: "Priority Support", free: false, basic: false, pro: true },
    { name: "Team Analytics", free: false, basic: false, pro: true },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container">
          <motion.div className="text-center mb-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">
              Choose Your <span className="gradient-text">Growth Plan</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-6">Start free, scale as you grow. Basic for individuals, Pro for teams.</p>
            {plan.isExpired && (
              <p className="text-sm text-destructive font-medium">Your plan has expired. Renew to restore access.</p>
            )}
          </motion.div>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${billing === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${billing === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
            >
              Yearly
              {basicConfig && getSavings(basicConfig) > 0 && (
                <span className="absolute -top-2 -right-2 text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                  Save {Math.round((1 - basicConfig.yearly_price / (basicConfig.monthly_price * 12)) * 100)}%
                </span>
              )}
            </button>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {/* Free */}
            <motion.div className="glass-card p-6 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6">
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Free</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-heading font-bold">₹0</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">View-only, forever free</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {["View shared funnels", "Access public content", "Browse marketplace"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check size={14} className="text-primary shrink-0" /> {f}</li>
                ))}
                {["Create funnels", "Create landing pages", "Go live", "Lead capture"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/60"><X size={14} className="shrink-0" /> {f}</li>
                ))}
              </ul>
              {!plan.isPaid && !plan.isExpired ? (
                <Button variant="outline" disabled className="w-full">Current Plan</Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(user ? "/dashboard" : "/auth?tab=signup")} className="w-full">
                  {user ? "Stay Free" : "Get Started"}
                </Button>
              )}
            </motion.div>

            {/* Basic */}
            <motion.div className="glass-card p-6 flex flex-col relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border border-border text-xs font-semibold flex items-center gap-1">
                <User size={12} /> For Individuals
              </div>
              <div className="mb-6">
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-medium">Basic</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-heading font-bold">₹{getPrice(basicConfig).toLocaleString("en-IN")}</span>
                  <span className="text-sm text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>
                </div>
                {billing === "monthly" && basicConfig && (
                  <p className="text-xs text-muted-foreground mt-1">
                    or ₹{basicConfig.yearly_price.toLocaleString("en-IN")}/year — save ₹{getSavings(basicConfig).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {[
                  `Up to ${basicConfig?.max_funnels || 3} Funnels`,
                  `Up to ${basicConfig?.max_landing_pages || 2} Landing Pages`,
                  `Up to ${basicConfig?.max_live_sessions || 1} Live Sessions`,
                  "Lead Capture",
                  "Analytics",
                  "WhatsApp Automation",
                  basicConfig?.multilevel_funnel_enabled ? "Multi-level Funnels" : null,
                ].filter(Boolean).map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check size={14} className="text-primary shrink-0" /> {f}</li>
                ))}
                {[
                  !basicConfig?.multilevel_funnel_enabled ? "Multi-level Funnels" : null,
                  "Team Members",
                  "Team Analytics",
                ].filter(Boolean).map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/60"><Lock size={14} className="shrink-0" /> {f}</li>
                ))}
              </ul>
              {isCurrentTier("basic") ? (
                <Button disabled className="w-full">Current Plan</Button>
              ) : (
                <Button className="w-full gap-2" onClick={() => handlePayment("basic")} disabled={loading === `basic_${billing}`}>
                  {loading === `basic_${billing}` ? <Loader2 size={16} className="animate-spin" /> : null}
                  Subscribe — ₹{getPrice(basicConfig).toLocaleString("en-IN")}/{billing === "monthly" ? "mo" : "yr"}
                </Button>
              )}
            </motion.div>

            {/* Pro */}
            <motion.div className="glass-card p-6 flex flex-col relative border-primary/40 glow-primary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground flex items-center gap-1">
                <Users size={12} /> Most Popular
              </div>
              <div className="mb-6">
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-medium">Pro</span>
                <div className="flex items-baseline gap-1 mt-3">
                  <span className="text-3xl font-heading font-bold">₹{getPrice(proConfig).toLocaleString("en-IN")}</span>
                  <span className="text-sm text-muted-foreground">/{billing === "monthly" ? "mo" : "yr"}</span>
                </div>
                {billing === "monthly" && proConfig && (
                  <p className="text-xs text-primary mt-1">
                    or ₹{proConfig.yearly_price.toLocaleString("en-IN")}/year — save ₹{getSavings(proConfig).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {[
                  proConfig?.max_funnels === -1 ? "Unlimited Funnels" : `Up to ${proConfig?.max_funnels || 10} Funnels`,
                  proConfig?.max_landing_pages === -1 ? "Unlimited Landing Pages" : `Up to ${proConfig?.max_landing_pages || 5} Landing Pages`,
                  proConfig?.max_live_sessions === -1 ? "Unlimited Live Sessions" : `Up to ${proConfig?.max_live_sessions || 5} Live Sessions`,
                  proConfig?.multilevel_funnel_enabled ? "Multi-level Funnels ✓" : null,
                  `Team Members (up to ${proConfig?.max_team_members === -1 ? "∞" : proConfig?.max_team_members || 10})`,
                  "Team Analytics Dashboard",
                  "Lead Capture",
                  "Advanced Analytics",
                  "WhatsApp Automation",
                  "Video Sharing",
                  "Priority Support",
                ].filter(Boolean).map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm"><Check size={14} className="text-primary shrink-0" /> {f}</li>
                ))}
              </ul>
              {isCurrentTier("pro") ? (
                <Button disabled className="w-full">Current Plan</Button>
              ) : (
                <Button className="w-full gap-2" onClick={() => handlePayment("pro")} disabled={loading === `pro_${billing}`}>
                  {loading === `pro_${billing}` ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                  Subscribe — ₹{getPrice(proConfig).toLocaleString("en-IN")}/{billing === "monthly" ? "mo" : "yr"}
                </Button>
              )}
            </motion.div>
          </div>

          {/* Comparison table */}
          <div className="glass-card overflow-hidden max-w-5xl mx-auto mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">Free</th>
                    <th className="text-center p-4 font-medium">Basic</th>
                    <th className="text-center p-4 font-medium text-primary">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((f) => (
                    <tr key={f.name} className="border-b border-border/50">
                      <td className="p-4">{f.name}</td>
                      {(["free", "basic", "pro"] as const).map((t) => {
                        const val = f[t];
                        return (
                          <td key={t} className="p-4 text-center">
                            {typeof val === "boolean" ? (
                              val ? <Check size={16} className="text-primary mx-auto" /> : <X size={16} className="text-muted-foreground/40 mx-auto" />
                            ) : <span className="text-muted-foreground">{val}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="max-w-lg mx-auto text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield size={16} /> Secure payments via Razorpay
            </div>
            <p className="text-sm text-muted-foreground">
              Need help choosing a plan?{" "}
              <button className="text-primary underline" onClick={() => openSupport("Hi, I need help choosing a Nevorai Flow plan.")}>
                Chat with us on WhatsApp
              </button>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PricingFullPage;
