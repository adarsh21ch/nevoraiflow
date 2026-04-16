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
  max_videos: number;
  max_storage_mb: number;
  multilevel_funnel_enabled: boolean;
  is_enabled?: boolean;
  feature_lead_capture?: boolean;
  feature_analytics?: boolean;
  feature_whatsapp_automation?: boolean;
  feature_video_sharing?: boolean;
  feature_priority_support?: boolean;
  feature_advanced_analytics?: boolean;
  feature_go_live?: boolean;
  feature_landing_pages?: boolean;
  feature_team_analytics?: boolean;
  feature_video_upload?: boolean;
  feature_insights?: boolean;
  feature_funnel_creation?: boolean;
  plan_badge_text?: string | null;
}

// Hardcoded fallback only if DB has no free row yet
const FREE_FALLBACK: PlanConfig = {
  plan_name: "free",
  monthly_price: 0,
  yearly_price: 0,
  yearly_validity_days: 0,
  max_funnels: 0,
  max_landing_pages: 0,
  max_live_sessions: 0,
  max_team_members: 0,
  max_videos: 0,
  max_storage_mb: 0,
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
  feature_video_upload: false,
  feature_insights: false,
  feature_funnel_creation: false,
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
  // Always try to get config from DB — admin panel is source of truth
  const config = planConfigs.find(c => c.plan_name === tier) || FREE_FALLBACK;

  const isFree = tier === "free" || (!plan.isPaid);

  // Limit checks — all driven by DB config
  const canCreateFunnel = config.feature_funnel_creation !== false && (config.max_funnels === -1 || counts.funnels < config.max_funnels);
  const canCreateLandingPage = config.feature_landing_pages !== false && (config.max_landing_pages === -1 || counts.landing_pages < config.max_landing_pages);
  const canCreateLive = config.feature_go_live !== false && (config.max_live_sessions === -1 || counts.live_sessions < config.max_live_sessions);
  const canUseMultilevel = config.multilevel_funnel_enabled;
  const canAddTeamMember = tier === "pro" && (config.max_team_members === -1 || teamCount < config.max_team_members);
  const canUploadVideo = config.feature_video_upload === true && (config.max_videos === -1 || counts.videos < (config.max_videos ?? 0));

  const isFunnelLimitReached = config.max_funnels !== -1 && counts.funnels >= config.max_funnels;
  const isLandingPageLimitReached = config.max_landing_pages !== -1 && counts.landing_pages >= config.max_landing_pages;
  const isLiveLimitReached = config.max_live_sessions !== -1 && counts.live_sessions >= config.max_live_sessions;
  const isTeamLimitReached = tier === "pro" && config.max_team_members !== -1 && teamCount >= config.max_team_members;
  const isVideoLimitReached = config.max_videos !== -1 && counts.videos >= (config.max_videos ?? 0);

  // Feature flags — all driven by DB config
  const features = {
    leadCapture: config.feature_lead_capture !== false,
    analytics: config.feature_analytics !== false,
    whatsappAutomation: config.feature_whatsapp_automation === true,
    videoSharing: config.feature_video_sharing === true,
    prioritySupport: config.feature_priority_support === true,
    advancedAnalytics: config.feature_advanced_analytics === true,
    multilevelFunnels: config.multilevel_funnel_enabled,
    teamMembers: tier === "pro" && config.max_team_members !== 0,
    teamAnalytics: config.feature_team_analytics === true,
    goLive: config.feature_go_live !== false,
    landingPages: config.feature_landing_pages !== false,
    videoUpload: config.feature_video_upload === true,
    insights: config.feature_insights === true,
    funnelCreation: config.feature_funnel_creation !== false,
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
    canUploadVideo,
    isFunnelLimitReached,
    isLandingPageLimitReached,
    isLiveLimitReached,
    isTeamLimitReached,
    isVideoLimitReached,
    planConfigs,
    features,
  };
};
