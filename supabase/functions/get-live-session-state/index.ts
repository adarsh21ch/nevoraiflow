import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

type State = "waiting" | "live" | "ended" | "replay";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    let sessionId = url.searchParams.get("session_id");
    let slug = url.searchParams.get("slug");
    if (!sessionId && !slug && (req.method === "POST")) {
      try {
        const body = await req.json();
        sessionId = body.session_id ?? sessionId;
        slug = body.slug ?? slug;
      } catch (_) { /* ignore */ }
    }
    if (!sessionId && !slug) {
      return json({ error: "session_id or slug is required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch session
    let q = supabase.from("live_sessions").select("*").limit(1);
    q = sessionId ? q.eq("id", sessionId) : q.eq("slug", slug!);
    const { data: session, error: sErr } = await q.maybeSingle();
    if (sErr || !session) return json({ error: "Session not found" }, 404);

    const now = Date.now();
    const isFunnelVideo = session.session_type === "funnel_video";

    // External link sessions: legacy behavior — single scheduled_at, treat as informational
    if (!isFunnelVideo) {
      return json({
        state: session.status === "live" ? "live" : session.status === "ended" ? "ended" : "waiting",
        seek_seconds: 0,
        next_slot: session.scheduled_at,
        current_slot_start: null,
        current_slot_end: null,
        seconds_until_next: session.scheduled_at
          ? Math.max(0, Math.floor((new Date(session.scheduled_at).getTime() - now) / 1000))
          : 0,
        replay_available: !!session.replay_enabled && !!session.replay_url,
        video_url: session.replay_url || null,
        meeting_url: session.meeting_url || null,
        funnel_data: null,
        session_type: "external_link",
        all_slots: session.scheduled_at ? [session.scheduled_at] : [],
      });
    }

    // Resolve video URL + duration
    let videoUrl: string | null = null;
    let videoDuration: number | null = session.video_duration_seconds || null;
    let funnelData: Record<string, unknown> | null = null;

    if (session.funnel_id) {
      const { data: funnel } = await supabase
        .from("funnels")
        .select("id, title, slug, description, video_asset_id, thumbnail_url, speaker_mode, speaker_name, speaker_photo_url, speaker_about, owner_id")
        .eq("id", session.funnel_id)
        .maybeSingle();
      if (funnel) {
        funnelData = funnel;
        const vId = session.video_asset_id || funnel.video_asset_id;
        if (vId) {
          const { data: video } = await supabase
            .from("video_assets")
            .select("id, public_url, thumbnail_url, duration_seconds")
            .eq("id", vId)
            .maybeSingle();
          if (video) {
            videoUrl = video.public_url;
            if (!videoDuration) videoDuration = video.duration_seconds || null;
          }
        }
      }
    }

    const duration = videoDuration ?? session.duration_minutes * 60 ?? 3600;
    const slotsRaw: string[] = Array.isArray(session.scheduled_times) ? session.scheduled_times : [];
    const slots = slotsRaw
      .map((t) => new Date(t).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);

    const replayDelayMs = (session.replay_available_after_minutes ?? 30) * 60 * 1000;

    let state: State = "waiting";
    let seekSeconds = 0;
    let currentSlotStart: number | null = null;
    let currentSlotEnd: number | null = null;
    let nextSlot: number | null = null;
    let secondsUntilNext = 0;

    // Find current live slot
    for (const start of slots) {
      const end = start + duration * 1000;
      if (now >= start && now <= end) {
        state = "live";
        currentSlotStart = start;
        currentSlotEnd = end;
        seekSeconds = Math.max(0, Math.floor((now - start) / 1000));
        break;
      }
    }

    // No live slot — find next future slot
    if (state === "waiting") {
      const future = slots.find((s) => s > now);
      if (future) {
        nextSlot = future;
        secondsUntilNext = Math.max(0, Math.floor((future - now) / 1000));
      } else {
        // All slots are past — replay or ended
        const lastEnd = slots.length ? slots[slots.length - 1] + duration * 1000 : 0;
        if (session.replay_enabled && now >= lastEnd + replayDelayMs && videoUrl) {
          state = "replay";
        } else if (session.replay_enabled && lastEnd && now < lastEnd + replayDelayMs) {
          state = "ended";
          // replay coming soon — caller can compute countdown
          nextSlot = lastEnd + replayDelayMs;
          secondsUntilNext = Math.max(0, Math.floor((nextSlot - now) / 1000));
        } else {
          state = "ended";
        }
      }
    }

    const replayAvailable =
      !!session.replay_enabled &&
      slots.length > 0 &&
      now >= slots[slots.length - 1] + duration * 1000 + replayDelayMs &&
      !!videoUrl;

    return json({
      state,
      seek_seconds: seekSeconds,
      next_slot: nextSlot ? new Date(nextSlot).toISOString() : null,
      current_slot_start: currentSlotStart ? new Date(currentSlotStart).toISOString() : null,
      current_slot_end: currentSlotEnd ? new Date(currentSlotEnd).toISOString() : null,
      seconds_until_next: secondsUntilNext,
      replay_available: replayAvailable,
      video_url: videoUrl,
      video_duration_seconds: duration,
      funnel_data: funnelData,
      session_type: "funnel_video",
      all_slots: slots.map((t) => new Date(t).toISOString()),
      session: {
        id: session.id,
        title: session.title,
        description: session.description,
        slug: session.slug,
        access_type: session.access_type,
        replay_enabled: session.replay_enabled,
        registration_count: session.registration_count,
        timezone: session.timezone,
        show_name: session.show_name,
        show_phone: session.show_phone,
        show_email: session.show_email,
        show_city: session.show_city,
      },
    });
  } catch (err) {
    console.error("get-live-session-state error", err);
    return json({ error: "Internal error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
