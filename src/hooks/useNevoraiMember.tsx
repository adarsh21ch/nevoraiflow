import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Returns the user's Nevorai Member status. A "Member" is a user who has been
 * verified via the Nevorai bridge as having an active Pro subscription on
 * the calling Nevorai app — they get Individual plan access for free.
 */
export const useNevoraiMember = () => {
  const { user, profile } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["nevorai-member", user?.id],
    queryFn: async () => {
      if (!user) return { isMember: false, welcomeShown: true };
      const { data: p } = await supabase
        .from("profiles")
        .select("nevorai_member, nevorai_member_active, member_welcome_shown, nevorai_member_granted_at")
        .eq("id", user.id)
        .maybeSingle();
      return {
        isMember: !!(p?.nevorai_member && p?.nevorai_member_active),
        welcomeShown: !!p?.member_welcome_shown,
        grantedAt: p?.nevorai_member_granted_at || null,
      };
    },
    enabled: !!user,
    staleTime: 30000,
  });

  const markWelcomeShown = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ member_welcome_shown: true })
      .eq("id", user.id);
  };

  return {
    isMember: data?.isMember ?? false,
    welcomeShown: data?.welcomeShown ?? true,
    grantedAt: data?.grantedAt ?? null,
    isLoading,
    markWelcomeShown,
  };
};
