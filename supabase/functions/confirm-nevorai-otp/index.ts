// confirm-nevorai-otp
// Verifies the 6-digit OTP, then upgrades the user's profile to Nevorai Member
// (Individual plan = plan_key 'pro'). Logs the event to member_access_logs.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ConfirmRequest {
  email: string;
  code: string;
}

async function hashCode(code: string): Promise<string> {
  const enc = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as ConfirmRequest;
    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();

    if (!email || !code || !/^\d{6}$/.test(code)) {
      return new Response(
        JSON.stringify({ error: "Valid email and 6-digit code required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Require a logged-in user (we need their user_id to grant access)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Invalid session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = claims.claims.sub as string;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const codeHash = await hashCode(code);

    // Find latest unconsumed OTP for this email
    const { data: otp, error: otpErr } = await supabase
      .from("member_otps")
      .select("*")
      .eq("email", email)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpErr || !otp) {
      return new Response(
        JSON.stringify({ error: "Code expired or not found. Please request a new one." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (otp.attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Too many attempts. Request a new code." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (otp.code_hash !== codeHash) {
      await supabase
        .from("member_otps")
        .update({ attempts: otp.attempts + 1 })
        .eq("id", otp.id);
      return new Response(
        JSON.stringify({ error: "Incorrect code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark OTP consumed
    await supabase
      .from("member_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", otp.id);

    // Look up the registry entry to capture plan info
    const { data: registry } = await supabase
      .from("nevorai_member_registry")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (!registry?.is_pro) {
      return new Response(
        JSON.stringify({ error: "No active Nevorai Pro subscription found for this email." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Grant Member status on the profile
    await supabase
      .from("profiles")
      .update({
        nevorai_member: true,
        nevorai_member_active: true,
        nevorai_member_source: "bridge",
        nevorai_member_granted_at: new Date().toISOString(),
        nevorai_member_last_checked_at: new Date().toISOString(),
      })
      .eq("id", userId);

    // Create / update active subscription as 'pro' (Individual UI label)
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const { data: existingSub } = await supabase
      .from("user_subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (existingSub) {
      await supabase
        .from("user_subscriptions")
        .update({
          plan_key: "pro",
          tier: "pro",
          status: "active",
          billing_type: "nevorai_member",
          expires_at: expiresAt,
          started_at: new Date().toISOString(),
        })
        .eq("id", existingSub.id);
    } else {
      await supabase.from("user_subscriptions").insert({
        user_id: userId,
        plan_key: "pro",
        tier: "pro",
        status: "active",
        billing_type: "nevorai_member",
        started_at: new Date().toISOString(),
        expires_at: expiresAt,
      });
    }

    // Log event
    await supabase.from("member_access_logs").insert({
      user_id: userId,
      email,
      event_type: "member_granted",
      source: "bridge_otp",
      metadata: { plan: registry.plan, registry_id: registry.id },
    });

    return new Response(
      JSON.stringify({ success: true, plan: "Individual" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[confirm-nevorai-otp] Unhandled error:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
