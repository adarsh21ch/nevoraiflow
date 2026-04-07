import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check, X, Crown, MessageCircle, Shield, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useWhatsAppSupport } from "@/hooks/useWhatsAppSupport";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window { Razorpay: any; }
}

const features = [
  { name: "Funnels", free: "2", paid: "Unlimited" },
  { name: "Videos", free: "5 (100MB)", paid: "Unlimited (2GB)" },
  { name: "Lead Capture", free: true, paid: true },
  { name: "Analytics", free: "Basic", paid: "Advanced" },
  { name: "WhatsApp Auto-message", free: false, paid: true },
  { name: "Audio Notes", free: false, paid: true },
  { name: "UPI Payment Collection", free: false, paid: true },
  { name: "Live Sessions", free: false, paid: true },
  { name: "Video Sharing", free: false, paid: true },
  { name: "Video Upload & Links", free: false, paid: true },
  { name: "Priority Support", free: false, paid: true },
];

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

  const handlePayment = useCallback(async (planKey: string, amount: number) => {
    if (!user) {
      navigate("/auth?tab=signup&redirect=/upgrade");
      return;
    }

    setLoading(planKey);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) throw new Error("Failed to load payment gateway");

      // Create order
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
          } catch (err: any) {
            toast.error("Payment received but verification pending. Contact support if access isn't unlocked.");
            openSupport("Hi, my payment was successful but access not unlocked. Payment ID: " + response.razorpay_payment_id);
          }
        },
        prefill: { email: user.email },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => setLoading(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
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

  const isCurrentPlan = (tier: string) => plan.isPaid && plan.tier === tier && !plan.isExpired;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">
              Unlock the Full Power of <span className="gradient-text">Nevorai Flow</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-2">Choose the plan that fits your goals. Start free, upgrade anytime.</p>
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
                {["2 Funnels", "5 Videos (100MB)", "Basic Analytics", "Lead Capture"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {isCurrentPlan("free") ? (
                <Button variant="outline" disabled className="w-full">Current Plan</Button>
              ) : (
                <Button variant="outline" onClick={() => navigate(user ? "/dashboard" : "/auth?tab=signup")} className="w-full">
                  {user ? "Stay Free" : "Start Free"}
                </Button>
              )}
            </motion.div>

            {/* Monthly */}
            <motion.div className="glass-card p-6 flex flex-col relative border-primary/40 glow-primary" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                Most Popular
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">Pro Monthly</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">₹499</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-xs text-primary mt-1">Just ₹17/day</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {["Unlimited Funnels", "Unlimited Videos (2GB)", "Advanced Analytics", "Live Sessions", "Video Sharing", "WhatsApp Automation", "Priority Support"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {isCurrentPlan("pro") && plan.billingType === "monthly" ? (
                <Button disabled className="w-full">Current Plan</Button>
              ) : (
                <Button
                  className="w-full gap-2"
                  onClick={() => handlePayment("pro_monthly", 499)}
                  disabled={loading === "pro_monthly"}
                >
                  {loading === "pro_monthly" ? <Loader2 size={16} className="animate-spin" /> : <Crown size={16} />}
                  {plan.isExpired ? "Renew — ₹499/mo" : "Subscribe — ₹499/mo"}
                </Button>
              )}
            </motion.div>

            {/* One-time */}
            <motion.div className="glass-card p-6 flex flex-col" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-card border border-border text-xs font-semibold">
                Best Value
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">Pro Yearly</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">₹2,999</span>
                  <span className="text-sm text-muted-foreground">/year</span>
                </div>
                <p className="text-xs text-primary mt-1">Just ₹8/day — save ₹2,989</p>
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {["Everything in Monthly", "365-day access", "Biggest savings", "Priority Support"].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {isCurrentPlan("pro") && plan.billingType === "one_time" ? (
                <Button variant="outline" disabled className="w-full">Current Plan</Button>
              ) : (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => handlePayment("pro_yearly", 2999)}
                  disabled={loading === "pro_yearly"}
                >
                  {loading === "pro_yearly" ? <Loader2 size={16} className="animate-spin" /> : null}
                  Buy Once — ₹2,999
                </Button>
              )}
            </motion.div>
          </div>

          {/* Feature comparison */}
          <div className="glass-card overflow-hidden max-w-4xl mx-auto mb-12">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 font-medium">Feature</th>
                    <th className="text-center p-4 font-medium">Free</th>
                    <th className="text-center p-4 font-medium text-primary">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.name} className="border-b border-border/50">
                      <td className="p-4">{f.name}</td>
                      {(["free", "paid"] as const).map((tier) => {
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
