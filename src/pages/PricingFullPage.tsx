import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, Shield, ArrowRight, Loader2, Users, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useWhatsAppSupport } from "@/hooks/useWhatsAppSupport";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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
  const { user } = useAuth();
  const { plan, refreshPlan } = usePlan();
  const { openSupport } = useWhatsAppSupport();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  // Fetch active plans from DB
  const { data: plans = [] } = useQuery({
    queryKey: ["active-plans"],
    queryFn: async () => {
      const { data } = await supabase
        .from("admin_subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_inr");
      return data || [];
    },
    staleTime: 60000,
  });

  const getPlan = (key: string) => plans.find((p: any) => p.plan_key === key);
  const freePlan = getPlan("free");
  const basicMonthly = getPlan("basic_monthly");
  const basicYearly = getPlan("basic_yearly");
  const proMonthly = getPlan("pro_monthly");
  const proYearly = getPlan("pro_yearly");

  const handlePayment = useCallback(async (planKey: string, amount: number) => {
    if (!user) {
      navigate("/auth?tab=signup&redirect=/upgrade");
      return;
    }
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
        description: `${planKey.replace(/_/g, " ")} Plan`,
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
            toast.success("Payment successful! Welcome to " + (verifyData?.tier || "Pro") + " 🎉");
            refreshPlan();
            setTimeout(() => navigate("/dashboard"), 1500);
          } catch {
            toast.error("Payment received but verification pending. Contact support.");
            openSupport("Hi, my payment was successful but access not unlocked. Payment ID: " + response.razorpay_payment_id);
          }
        },
        prefill: { email: user.email },
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setLoading(null) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setLoading(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(null);
    }
  }, [user, navigate, openSupport, refreshPlan]);

  const isCurrentTier = (tier: string) => plan.isPaid && plan.tier === tier && !plan.isExpired;

  const freeFeatures = freePlan?.features as string[] || ["1 Funnel", "3 Videos (100MB)", "1 Landing Page", "Basic Analytics", "Lead Capture"];
  const basicFeatures = basicMonthly?.features as string[] || ["5 Funnels", "20 Videos (500MB)", "3 Landing Pages", "2 Live Sessions", "Advanced Analytics", "Lead Capture", "WhatsApp Auto-message"];
  const proFeatures = proMonthly?.features as string[] || ["Unlimited Funnels", "Unlimited Videos (2GB)", "Unlimited Landing Pages", "Unlimited Live Sessions", "Multi-step Journeys", "Advanced Analytics", "WhatsApp Automation", "Video Sharing", "Priority Support"];

  const comparisonFeatures = [
    { name: "Funnels", free: freePlan?.funnel_limit ?? 1, basic: basicMonthly?.funnel_limit ?? 5, pro: "Unlimited" },
    { name: "Videos", free: `${freePlan?.video_limit ?? 3} (${freePlan?.video_max_size_mb ?? 100}MB)`, basic: `${basicMonthly?.video_limit ?? 20} (${basicMonthly?.video_max_size_mb ?? 500}MB)`, pro: "Unlimited (2GB)" },
    { name: "Landing Pages", free: (freePlan as any)?.landing_page_limit ?? 1, basic: (basicMonthly as any)?.landing_page_limit ?? 3, pro: "Unlimited" },
    { name: "Live Sessions", free: (freePlan as any)?.live_session_limit ?? 0, basic: (basicMonthly as any)?.live_session_limit ?? 2, pro: "Unlimited" },
    { name: "Multi-step Journeys", free: false, basic: false, pro: true },
    { name: "Lead Capture", free: true, basic: true, pro: true },
    { name: "Analytics", free: "Basic", basic: "Advanced", pro: "Advanced" },
    { name: "WhatsApp Automation", free: false, basic: true, pro: true },
    { name: "Video Sharing", free: false, basic: false, pro: true },
    { name: "Video Upload & Links", free: false, basic: true, pro: true },
    { name: "Priority Support", free: false, basic: false, pro: true },
    { name: "Team Use", free: false, basic: false, pro: true },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">
              Choose Your <span className="gradient-text">Growth Plan</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-2">Start free, scale as you grow. Basic for individuals, Pro for teams.</p>
            {plan.isExpired && (
              <p className="text-sm text-destructive font-medium mt-2">Your plan has expired. Renew to restore access.</p>
            )}
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {/* Free */}
            <motion.div className="glass-card p-6 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">Free</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">₹0</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Forever free, no card required</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {freeFeatures.map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {!plan.isPaid && !plan.isExpired ? (
                <Button variant="outline" disabled className="w-full">Current Plan</Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(user ? "/dashboard" : "/auth?tab=signup")} className="w-full">
                  {user ? "Stay Free" : "Start Free"}
                </Button>
              )}
            </motion.div>

            {/* Basic */}
            <motion.div className="glass-card p-6 flex flex-col relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border border-border text-xs font-semibold flex items-center gap-1">
                <User size={12} /> For Individuals
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">Basic</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">₹{(basicMonthly?.price_inr || 499).toLocaleString("en-IN")}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  or ₹{(basicYearly?.price_inr || 2999).toLocaleString("en-IN")}/year — save ₹{((basicMonthly?.price_inr || 499) * 12 - (basicYearly?.price_inr || 2999)).toLocaleString("en-IN")}
                </p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {basicFeatures.map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                {isCurrentTier("basic") ? (
                  <Button disabled className="w-full">Current Plan</Button>
                ) : (
                  <>
                    <Button
                      className="w-full gap-2"
                      onClick={() => handlePayment("basic_monthly", basicMonthly?.price_inr || 499)}
                      disabled={loading === "basic_monthly"}
                    >
                      {loading === "basic_monthly" ? <Loader2 size={16} className="animate-spin" /> : null}
                      Subscribe — ₹{(basicMonthly?.price_inr || 499).toLocaleString("en-IN")}/mo
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-xs"
                      onClick={() => handlePayment("basic_yearly", basicYearly?.price_inr || 2999)}
                      disabled={loading === "basic_yearly"}
                    >
                      {loading === "basic_yearly" ? <Loader2 size={16} className="animate-spin" /> : null}
                      Buy Yearly — ₹{(basicYearly?.price_inr || 2999).toLocaleString("en-IN")}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>

            {/* Pro */}
            <motion.div className="glass-card p-6 flex flex-col relative border-primary/40 glow-primary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground flex items-center gap-1">
                <Users size={12} /> For Teams
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">₹{(proMonthly?.price_inr || 999).toLocaleString("en-IN")}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-primary mt-1">
                  or ₹{(proYearly?.price_inr || 5999).toLocaleString("en-IN")}/year — save ₹{((proMonthly?.price_inr || 999) * 12 - (proYearly?.price_inr || 5999)).toLocaleString("en-IN")}
                </p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {proFeatures.map((f: string) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                {isCurrentTier("pro") ? (
                  <Button disabled className="w-full">Current Plan</Button>
                ) : (
                  <>
                    <Button
                      className="w-full gap-2"
                      onClick={() => handlePayment("pro_monthly", proMonthly?.price_inr || 999)}
                      disabled={loading === "pro_monthly"}
                    >
                      {loading === "pro_monthly" ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                      Subscribe — ₹{(proMonthly?.price_inr || 999).toLocaleString("en-IN")}/mo
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full gap-2 text-xs"
                      onClick={() => handlePayment("pro_yearly", proYearly?.price_inr || 5999)}
                      disabled={loading === "pro_yearly"}
                    >
                      {loading === "pro_yearly" ? <Loader2 size={16} className="animate-spin" /> : null}
                      Buy Yearly — ₹{(proYearly?.price_inr || 5999).toLocaleString("en-IN")}
                    </Button>
                  </>
                )}
              </div>
            </motion.div>
          </div>

          {/* Feature comparison */}
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
                      {(["free", "basic", "pro"] as const).map((tier) => {
                        const val = f[tier];
                        return (
                          <td key={tier} className="p-4 text-center">
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

          {/* Trust & support */}
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
