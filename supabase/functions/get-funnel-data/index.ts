import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug) {
      return new Response(JSON.stringify({ error: "slug is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch funnel
    const { data: funnel, error: funnelErr } = await supabase
      .from("funnels")
      .select("*")
      .eq("slug", slug)
      .single();

    if (funnelErr || !funnel) {
      return new Response(JSON.stringify({ error: "Funnel not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parallel fetches for related data
    const promises: Promise<any>[] = [];

    // Video asset
    if (funnel.video_asset_id) {
      promises.push(
        supabase
          .from("video_assets")
          .select("id, title, public_url, thumbnail_url, duration_seconds, status")
          .eq("id", funnel.video_asset_id)
          .single()
          .then((r) => ({ key: "video", data: r.data }))
      );
    } else {
      promises.push(Promise.resolve({ key: "video", data: null }));
    }

    // Creator profile
    promises.push(
      supabase
        .from("profiles")
        .select("full_name, city, instagram_url, avatar_url, kyc_status")
        .eq("id", funnel.owner_id)
        .single()
        .then((r) => ({ key: "creator", data: r.data }))
    );

    // Form config
    promises.push(
      supabase
        .from("funnel_lead_form_config")
        .select("*")
        .eq("funnel_id", funnel.id)
        .single()
        .then((r) => ({ key: "formConfig", data: r.data }))
    );

    // Price options (always fetch, let client decide)
    promises.push(
      supabase
        .from("funnel_price_options")
        .select("*")
        .eq("funnel_id", funnel.id)
        .order("position")
        .then((r) => ({ key: "priceOptions", data: r.data || [] }))
    );

    // Increment view count (fire-and-forget)
    supabase
      .from("funnels")
      .update({ total_views: (funnel.total_views || 0) + 1 })
      .eq("id", funnel.id)
      .then(() => {});

    const results = await Promise.all(promises);
    const resultMap: Record<string, any> = {};
    for (const r of results) {
      resultMap[r.key] = r.data;
    }

    const payload = {
      funnel,
      video: resultMap.video,
      creator: resultMap.creator,
      formConfig: resultMap.formConfig,
      priceOptions: resultMap.priceOptions,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
