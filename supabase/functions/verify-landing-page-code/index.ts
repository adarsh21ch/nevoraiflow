import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { page_id, code } = await req.json();

    if (!page_id || !code) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing page_id or code" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (typeof code !== "string" || code.length > 32) {
      return new Response(
        JSON.stringify({ success: false, message: "Invalid code format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: page, error } = await supabase
      .from("landing_pages")
      .select("id, access_code_enabled, access_code_plain")
      .eq("id", page_id)
      .maybeSingle();

    if (error || !page) {
      return new Response(
        JSON.stringify({ success: false, message: "Page not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!page.access_code_enabled || !page.access_code_plain) {
      return new Response(
        JSON.stringify({ success: true, no_code_required: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const expected = String(page.access_code_plain).trim().toUpperCase();
    const provided = code.trim().toUpperCase();
    const isValid = timingSafeEqual(expected, provided);

    if (isValid) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: "Incorrect code." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (_err) {
    return new Response(
      JSON.stringify({ success: false, message: "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
