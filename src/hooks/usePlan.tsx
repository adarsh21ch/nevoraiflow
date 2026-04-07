import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useCallback } from "react";

export interface PlanInfo {
  isActive: boolean;
  isPaid: boolean;
  tier: string;
  planKey: string;
  status: string;
  expiresAt: string | null;
  startedAt: string | null;
  billingType: string | null;
  amountPaid: number | null;
  razorpayPaymentId: string | null;
  daysLeft: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
}

const PREMIUM_FEATURES = [
  "video_upload",
  "video_link",
  "video_sharing",
  "live_broadcast",
  "advanced_analytics",
  "premium_templates",
  "premium_automation",
  "whatsapp_auto",
  "unlimited_funnels",
  "unlimited_videos",
];

export const usePlan = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["user-plan", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "payment_failed", "pending"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const now = new Date();
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at) : null;
  const isExpired = expiresAt ? expiresAt < now : false;
  const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - now.getTime()) / 86400000) : null;
  const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

  const isActive = subscription?.status === "active" && !isExpired;
  const isPaid = isActive && subscription?.tier !== "free";
  const tier = isActive ? (subscription?.tier || "free") : "free";

  const plan: PlanInfo = {
    isActive,
    isPaid,
    tier,
    planKey: subscription?.plan_key || "free",
    status: isExpired ? "expired" : (subscription?.status || "active"),
    expiresAt: subscription?.expires_at || null,
    startedAt: subscription?.started_at || null,
    billingType: subscription?.billing_type || null,
    amountPaid: subscription?.amount_paid || null,
    razorpayPaymentId: subscription?.razorpay_payment_id || null,
    daysLeft,
    isExpired,
    isExpiringSoon,
  };

  const canAccess = useCallback((feature: string): boolean => {
    if (tier === "pro") return true;
    if (tier === "basic") {
      return !["live_broadcast", "video_sharing", "advanced_analytics", "premium_templates", "premium_automation"].includes(feature);
    }
    // free tier
    return !PREMIUM_FEATURES.includes(feature);
  }, [tier]);

  const refreshPlan = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["user-plan"] });
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
  }, [queryClient]);

  return { plan, canAccess, isLoading, refreshPlan };
};
