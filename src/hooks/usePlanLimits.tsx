import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { usePlan } from "./usePlan";
import { useResourceCount } from "./useResourceCount";

export interface PlanConfig {
  plan_name: string;
  monthly_price: number;
  yearly_price: number;
  yearly_validity_days: number;
  max_funnels: number;
  max_landing_pages: number;
  max_live_sessions: number;
  max_team_members: number;
  multilevel_funnel_enabled: boolean;
  is_enabled?: boolean;
  // Feature flags
  feature_lead_capture?: boolean;
  feature_analytics?: boolean;
  feature_whatsapp_automation?: boolean;
  feature_video_sharing?: boolean;
  feature_priority_support?: boolean;
  feature_advanced_analytics?: boolean;
  feature_go_live?: boolean;
  feature_landing_pages?: boolean;
  feature_team_analytics?: boolean;
  plan_badge_text?: string | null;
}

const FREE_CONFIG: PlanConfig = {
  plan_name: "free",
  monthly_price: 0,
  yearly_price: 0,
  yearly_validity_days: 0,
  max_funnels: 0,
  max_landing_pages: 0,
  max_live_sessions: 0,
  max_team_members: 0,
  multilevel_funnel_enabled: false,
  feature_lead_capture: false,
  feature_analytics: false,
  feature_whatsapp_automation: false,
  feature_video_sharing: false,
  feature_priority_support: false,
  feature_advanced_analytics: false,
  feature_go_live: false,
  feature_landing_pages: false,
  feature_team_analytics: false,
};

export const usePlanLimits = () => {
  const { user } = useAuth();
  const { plan } = usePlan();
  const counts = useResourceCount();

  const { data: planConfigs = [] } = useQuery({
    queryKey: ["plan-configs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_config")
        .select("*");
      return (data || []) as PlanConfig[];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: teamCount = 0 } = useQuery({
    queryKey: ["team-member-count", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase
        .from("team_members")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .in("status", ["pending", "active"]);
      return count || 0;
    },
    enabled: !!user && plan.tier === "pro",
  });

  const tier = plan.tier;
  const config = tier === "free"
    ? FREE_CONFIG
    : planConfigs.find(c => c.plan_name === tier) || FREE_CONFIG;

  const isFree = tier === "free" || (!plan.isPaid);

  // Limit checks
  const canCreateFunnel = !isFree && (config.max_funnels === -1 || counts.funnels < config.max_funnels);
  const canCreateLandingPage = !isFree && config.feature_landing_pages !== false && (config.max_landing_pages === -1 || counts.landing_pages < config.max_landing_pages);
  const canCreateLive = !isFree && config.feature_go_live !== false && (config.max_live_sessions === -1 || counts.live_sessions < config.max_live_sessions);
  const canUseMultilevel = !isFree && config.multilevel_funnel_enabled;
  const canAddTeamMember = tier === "pro" && (config.max_team_members === -1 || teamCount < config.max_team_members);

  const isFunnelLimitReached = !isFree && config.max_funnels !== -1 && counts.funnels >= config.max_funnels;
  const isLandingPageLimitReached = !isFree && config.max_landing_pages !== -1 && counts.landing_pages >= config.max_landing_pages;
  const isLiveLimitReached = !isFree && config.max_live_sessions !== -1 && counts.live_sessions >= config.max_live_sessions;
  const isTeamLimitReached = tier === "pro" && config.max_team_members !== -1 && teamCount >= config.max_team_members;

  // Feature flags
  const features = {
    leadCapture: !isFree && config.feature_lead_capture !== false,
    analytics: !isFree && config.feature_analytics !== false,
    whatsappAutomation: !isFree && config.feature_whatsapp_automation === true,
    videoSharing: !isFree && config.feature_video_sharing === true,
    prioritySupport: !isFree && config.feature_priority_support === true,
    advancedAnalytics: !isFree && config.feature_advanced_analytics === true,
    multilevelFunnels: !isFree && config.multilevel_funnel_enabled,
    teamMembers: tier === "pro" && config.max_team_members !== 0,
    teamAnalytics: !isFree && config.feature_team_analytics === true,
    goLive: !isFree && config.feature_go_live !== false,
    landingPages: !isFree && config.feature_landing_pages !== false,
  };

  return {
    tier,
    isFree,
    config,
    counts,
    teamCount,
    canCreateFunnel,
    canCreateLandingPage,
    canCreateLive,
    canUseMultilevel,
    canAddTeamMember,
    isFunnelLimitReached,
    isLandingPageLimitReached,
    isLiveLimitReached,
    isTeamLimitReached,
    planConfigs,
    features,
  };
};
