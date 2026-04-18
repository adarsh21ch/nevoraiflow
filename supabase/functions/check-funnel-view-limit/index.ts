// check-funnel-view-limit
// Public endpoint called by the funnel viewer on the first 'play' event.
// Atomically increments the daily counter and returns whether the view is allowed.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface CheckRequest {
  funnelId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { funnelId } = (await req.json()) as CheckRequest;

    if (!funnelId || !/^[0-9a-f-]{36}$/i.test(funnelId)) {
      return new Response(
        JSON.stringify({ allowed: false, error: "Invalid funnel id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up funnel owner + their plan limit
    const { data: funnel } = await supabase
      .from("funnels")
      .select("id, owner_id, is_published")
      .eq("id", funnelId)
      .maybeSingle();

    if (!funnel || !funnel.is_published) {
      return new Response(
        JSON.stringify({ allowed: false, error: "Funnel not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Get owner's active plan
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("plan_key")
      .eq("user_id", funnel.owner_id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const planKey = sub?.plan_key || "free";
    const { data: planConfig } = await supabase
      .from("plan_config")
      .select("daily_view_limit")
      .eq("plan_name", planKey)
      .maybeSingle();

    const limit = planConfig?.daily_view_limit ?? 100;

    // Unlimited
    if (limit === -1) {
      return new Response(
        JSON.stringify({ allowed: true, unlimited: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Atomic increment via DB function
    const { data: newCount, error: incErr } = await supabase.rpc(
      "increment_funnel_daily_view",
      { _funnel_id: funnelId },
    );

    if (incErr) {
      console.error("[check-funnel-view-limit] Increment failed:", incErr);
      // Fail open — don't block viewers due to our error
      return new Response(
        JSON.stringify({ allowed: true, error: "counter_unavailable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const allowed = (newCount as number) <= limit;

    return new Response(
      JSON.stringify({
        allowed,
        currentCount: newCount,
        limit,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[check-funnel-view-limit] Unhandled error:", e);
    return new Response(
      JSON.stringify({ allowed: true, error: "internal" }), // fail open
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
