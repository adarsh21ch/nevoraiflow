import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Continuously verifies admin role.
 * - Re-checks every 60 seconds while mounted (catches role revocations mid-session)
 * - Re-checks on window focus (catches changes made in another tab/device)
 * - Short staleTime so other components also get fresh data
 */
export const useAdmin = () => {
  const { user } = useAuth();

  const { data: isAdmin = false, isLoading } = useQuery({
    queryKey: ["is-admin", user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) {
        // Fail closed — never grant admin on error
        console.error("[useAdmin] role check failed", error);
        return false;
      }
      return !!data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return { isAdmin, isLoading };
};
