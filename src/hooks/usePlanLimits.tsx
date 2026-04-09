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
};

export const usePlanLimits = () => {
  const { user } = useAuth();
  const { plan } = usePlan();
  const counts = useResourceCount();

  // Fetch plan_config for basic and pro
  const { data: planConfigs = [] } = useQuery({
    queryKey: ["plan-configs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("plan_config")
        .select("*");
      return (data || []) as PlanConfig[];
    },
    staleTime: 60000,
  });

  // Fetch team member count for the current user (Pro owners)
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

  const tier = plan.tier; // 'free', 'basic', 'pro'
  const config = tier === "free"
    ? FREE_CONFIG
    : planConfigs.find(c => c.plan_name === tier) || FREE_CONFIG;

  const isFree = tier === "free" || (!plan.isPaid);

  // Limit checks
  const canCreateFunnel = !isFree && (config.max_funnels === -1 || counts.funnels < config.max_funnels);
  const canCreateLandingPage = !isFree && (config.max_landing_pages === -1 || counts.landing_pages < config.max_landing_pages);
  const canCreateLive = !isFree && (config.max_live_sessions === -1 || counts.live_sessions < config.max_live_sessions);
  const canUseMultilevel = !isFree && config.multilevel_funnel_enabled;
  const canAddTeamMember = tier === "pro" && (config.max_team_members === -1 || teamCount < config.max_team_members);

  // Check if limit is reached (user has a paid plan but at max)
  const isFunnelLimitReached = !isFree && config.max_funnels !== -1 && counts.funnels >= config.max_funnels;
  const isLandingPageLimitReached = !isFree && config.max_landing_pages !== -1 && counts.landing_pages >= config.max_landing_pages;
  const isLiveLimitReached = !isFree && config.max_live_sessions !== -1 && counts.live_sessions >= config.max_live_sessions;
  const isTeamLimitReached = tier === "pro" && config.max_team_members !== -1 && teamCount >= config.max_team_members;

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
  };
};
