const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.searchParams.get('slug')

    if (!slug) {
      return new Response(JSON.stringify({ error: 'slug required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch landing page
    const { data: page, error } = await supabase
      .from('landing_pages')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single()

    if (error || !page) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch creator profile
    const { data: creator } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, kyc_status, instagram_url')
      .eq('id', page.owner_id)
      .single()

    // Fetch video if set
    let video = null
    if (page.post_submit_video_asset_id) {
      const { data: v } = await supabase
        .from('video_assets')
        .select('id, title, public_url, thumbnail_url')
        .eq('id', page.post_submit_video_asset_id)
        .single()
      video = v
    }

    // Increment views (fire and forget)
    supabase.rpc('increment_landing_page_views', { _landing_page_id: page.id }).then(() => {})

    // Insert view log
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    supabase.from('landing_page_view_logs').insert({
      landing_page_id: page.id,
      ip_address: ip,
    }).then(() => {})

    return new Response(JSON.stringify({ page, creator, video }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
