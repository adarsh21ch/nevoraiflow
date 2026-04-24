import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWhatsAppSupport } from "@/hooks/useWhatsAppSupport";

declare global {
  interface Window { Razorpay: any }
}

const STORAGE_KEY = "nflow_pending_plan";

export interface PendingPlan {
  planName: "basic" | "pro";
  billing: "monthly" | "yearly";
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

export function savePendingPlan(plan: PendingPlan) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plan)); } catch { }
}

export function loadPendingPlan(): PendingPlan | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && (parsed.planName === "basic" || parsed.planName === "pro")) return parsed;
    return null;
  } catch { return null; }
}

export function clearPendingPlan() {
  try { localStorage.removeItem(STORAGE_KEY); } catch { }
}

/**
 * Shared Razorpay checkout launcher used by both the landing PricingSection
 * and the full PricingFullPage. Pure client side, no navigation.
 */
export function useRazorpayCheckout(opts?: { onSuccessRedirect?: string }) {
  const { user, profile } = useAuth();
  const { openSupport } = useWhatsAppSupport();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<string | null>(null);

  // Cache plan_config so we can resolve amount without an extra DB round-trip
  const planConfigsRef = useRef<any[] | null>(null);
  const fetchPlanConfig = async (planName: string) => {
    if (!planConfigsRef.current) {
      const { data } = await supabase.from("plan_config").select("*");
      planConfigsRef.current = data || [];
    }
    return planConfigsRef.current.find((c: any) => c.plan_name === planName);
  };

  const startCheckout = useCallback(async (plan: PendingPlan) => {
    if (!user) {
      toast.error("Please sign in to continue.");
      return;
    }
    const config = await fetchPlanConfig(plan.planName);
    if (!config) {
      toast.error("Plan not available right now.");
      return;
    }
    const planKey = `${plan.planName}_${plan.billing}`;
    const amount = plan.billing === "monthly" ? config.monthly_price : config.yearly_price;
    setLoading(planKey);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment gateway");

      const { data, error } = await supabase.functions.invoke("razorpay-portal", {
        body: { action: "create_order", amount, plan_key: planKey },
      });
      if (error || !data?.order_id) throw new Error(error?.message || "Failed to create order");

      const planLabel = plan.planName.charAt(0).toUpperCase() + plan.planName.slice(1);
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "nFlow",
        description: `${planLabel} Plan — ${plan.billing}`,
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
            clearPendingPlan();
            toast.success(`Payment successful! Welcome to ${planLabel} 🎉`, { duration: 6000 });
            setTimeout(() => navigate(opts?.onSuccessRedirect || "/dashboard?welcome=1"), 1200);
          } catch {
            toast.error("Payment received but verification pending. Contact support.");
            openSupport(`Hi, my ${planLabel} payment was successful but access not unlocked. Payment ID: ${response.razorpay_payment_id}`);
          }
        },
        prefill: {
          name: profile?.full_name || "",
          email: user.email,
          contact: profile?.phone || "",
        },
        theme: { color: "#2563EB" },
        modal: {
          ondismiss: () => {
            setLoading(null);
          },
        },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setLoading(null);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err?.message || "Something went wrong");
      setLoading(null);
    }
  }, [user, profile, navigate, openSupport, opts?.onSuccessRedirect]);

  return { startCheckout, loading };
}

/**
 * Auto-trigger Razorpay if a pending plan was saved to localStorage before
 * the user authenticated. Fires once per mount when `user` becomes available.
 */
export function usePendingPlanAutoCheckout(startCheckout: (p: PendingPlan) => Promise<void>) {
  const { user } = useAuth();
  const firedRef = useRef(false);
  useEffect(() => {
    if (firedRef.current || !user) return;
    const pending = loadPendingPlan();
    if (!pending) return;
    firedRef.current = true;
    clearPendingPlan();
    setTimeout(() => startCheckout(pending), 350);
  }, [user, startCheckout]);
}
