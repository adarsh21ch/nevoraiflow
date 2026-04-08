import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { funnel_id, code } = await req.json();

    if (!funnel_id || !code) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing funnel_id or code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch funnel
    const { data: funnel, error } = await supabase
      .from("funnels")
      .select("id, access_code_plain, visibility")
      .eq("id", funnel_id)
      .single();

    if (error || !funnel) {
      return new Response(
        JSON.stringify({ success: false, message: "Funnel not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Case-insensitive comparison
    const isValid = funnel.access_code_plain &&
      code.trim().toUpperCase() === funnel.access_code_plain.trim().toUpperCase();

    // Log the attempt
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    await supabase.from("funnel_access_logs").insert({
      funnel_id,
      code_attempted: code,
      success: isValid,
      ip_address: ip,
    });

    if (isValid) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid code" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
