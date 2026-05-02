import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/landing/Logo";
import {
  Calendar, Clock, Users, ExternalLink, IndianRupee, Play, Pause, Volume2, VolumeX,
  CalendarPlus, Share2, MessageCircle, Copy, Maximize2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { googleCalendarUrl, buildICS, downloadICS } from "@/lib/liveSession";

type ViewerState = "waiting" | "live" | "ended" | "replay";

interface StateResponse {
  state: ViewerState;
  seek_seconds: number;
  next_slot: string | null;
  current_slot_start: string | null;
  current_slot_end: string | null;
  seconds_until_next: number;
  replay_available: boolean;
  video_url: string | null;
  video_duration_seconds?: number;
  funnel_data: any;
  session_type: "funnel_video" | "external_link";
  meeting_url?: string | null;
  all_slots: string[];
  session: {
    id: string;
    title: string;
    description: string | null;
    slug: string;
    access_type: string;
    replay_enabled: boolean;
    registration_count: number;
    timezone: string;
    show_name?: boolean;
    show_phone?: boolean;
    show_email?: boolean;
    show_city?: boolean;
    duration_minutes?: number;
  };
}

const formatCountdown = (sec: number) => {
  if (sec <= 0) return "Starting now!";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m`;
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
};

const PublicLivePage = () => {
  const { slug } = useParams();
  const [stateData, setStateData] = useState<StateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", city: "" });
  const [countdown, setCountdown] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [fakeViewers] = useState(() => Math.floor(Math.random() * 30) + 12);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSeekRef = useRef<number>(0);
  const viewerTokenRef = useRef<string>("");

  // Stable opaque viewer token
  useEffect(() => {
    if (!slug) return;
    const key = `nflow_viewer_${slug}`;
    let t = localStorage.getItem(key);
    if (!t) {
      t = (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`) + "-" + Math.random().toString(36).slice(2);
      localStorage.setItem(key, t);
    }
    viewerTokenRef.current = t;
  }, [slug]);

  // Heartbeat every 15s
  useEffect(() => {
    if (!stateData) return;
    const slot = stateData.current_slot_start || (stateData.all_slots?.length ? stateData.all_slots[stateData.all_slots.length - 1] : null);
    if (!slot || !stateData.session?.id) return;
    if (stateData.state !== "live" && stateData.state !== "replay") return;

    const send = async () => {
      const v = videoRef.current;
      if (v && v.paused) return;
      try {
        await supabase.rpc("record_live_heartbeat" as any, {
          _session_id: stateData.session.id,
          _session_slot: slot,
          _viewer_token: viewerTokenRef.current,
          _delta_seconds: 15,
        });
      } catch (e) { /* ignore */ }
    };
    send();
    const i = setInterval(send, 15_000);
    return () => clearInterval(i);
  }, [stateData?.state, stateData?.session?.id, stateData?.current_slot_start]);

  const fetchState = useCallback(async () => {
    if (!slug) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-live-session-state", { body: { slug } });
      if (error) throw error;
      setStateData(data as StateResponse);
      setCountdown(data?.seconds_until_next || 0);
    } catch (e) {
      console.error("fetchState failed", e);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { fetchState(); }, [fetchState]);

  useEffect(() => {
    const i = setInterval(fetchState, 30_000);
    return () => clearInterval(i);
  }, [fetchState]);

  useEffect(() => {
    if (!stateData || stateData.state !== "waiting") return;
    const i = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(i);
  }, [stateData]);

  // Set position when entering LIVE
  useEffect(() => {
    if (!stateData || stateData.state !== "live" || !videoRef.current || !stateData.video_url) return;
    const v = videoRef.current;
    const targetSeek = stateData.seek_seconds;
    lastSeekRef.current = targetSeek;
    const apply = () => {
      try {
        if (Math.abs(v.currentTime - targetSeek) > 2) v.currentTime = targetSeek;
        v.play().catch(() => {});
      } catch (_) {}
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
  }, [stateData?.state, stateData?.video_url, stateData?.seek_seconds]);

  // Lock seeking forward + force re-sync (live state only)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stateData || stateData.state !== "live") return;
    const onSeeking = () => {
      if (!stateData.current_slot_start) return;
      const livePos = Math.max(0, Math.floor((Date.now() - new Date(stateData.current_slot_start).getTime()) / 1000));
      if (v.currentTime > livePos + 1) v.currentTime = Math.max(0, livePos);
    };
    const onPlay = () => {
      setPaused(false);
      if (!stateData.current_slot_start) return;
      const livePos = Math.max(0, Math.floor((Date.now() - new Date(stateData.current_slot_start).getTime()) / 1000));
      if (Math.abs(v.currentTime - livePos) > 3) v.currentTime = livePos;
    };
    const onPause = () => setPaused(true);
    const onRate = () => { if (v.playbackRate !== 1) v.playbackRate = 1; };
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ratechange", onRate);
    return () => {
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ratechange", onRate);
    };
  }, [stateData]);

  const handleRegister = async () => {
    if (!stateData) return;
    setSubmitting(true);
    const { error } = await supabase.from("live_registrations").insert({
      session_id: stateData.session.id,
      name: form.name || null,
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      status: "registered",
      payment_status: stateData.session.access_type === "paid" ? "pending" : "none",
    });
    setSubmitting(false);
    if (error) { toast.error("Registration failed"); return; }
    setRegistered(true);
    toast.success("You're registered! We'll see you live.");
    fetchState();
  };

  const shareUrl = useMemo(() => `${window.location.origin}/s/${slug}`, [slug]);
  const shareTitle = stateData?.session?.title || "Live session";

  const handleShareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: shareTitle, url: shareUrl }); } catch {}
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    }
  };
  const handleShareWhatsApp = () => {
    const text = `Join me at "${shareTitle}" — ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };
  const handleCopy = () => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied!"); };

  const addToCalendar = (kind: "google" | "ics") => {
    if (!stateData) return;
    const startIso = stateData.next_slot || stateData.current_slot_start || stateData.all_slots?.[0];
    if (!startIso) { toast.error("No upcoming time"); return; }
    const start = new Date(startIso);
    const durSec = stateData.video_duration_seconds || (stateData.session?.duration_minutes ?? 60) * 60;
    const end = new Date(start.getTime() + durSec * 1000);
    if (kind === "google") {
      window.open(googleCalendarUrl({ title: shareTitle, description: stateData.session.description || "", start, end, url: shareUrl }), "_blank");
    } else {
      const ics = buildICS({ title: shareTitle, description: stateData.session.description || "", start, end, url: shareUrl, uid: stateData.session.id });
      downloadICS(`${slug}.ics`, ics);
    }
  };

  const requestFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    (v as any).requestFullscreen?.() ?? (v as any).webkitEnterFullscreen?.();
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }
  if (!stateData) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo size="lg" />
        <h1 className="text-xl font-heading font-bold">Session Not Available</h1>
        <p className="text-sm text-muted-foreground max-w-sm">This session may have been removed, hasn't been published yet, or the link is incorrect.</p>
      </div>
    );
  }

  const session = stateData.session;
  const funnel = stateData.funnel_data;
  const needsRegistration = session.access_type === "lead_gated" || session.access_type === "paid";
  const isFunnelVideo = stateData.session_type === "funnel_video";
  const speakerName = funnel?.speaker_name;
  const speakerPhoto = funnel?.speaker_photo_url;
  const allSlots = stateData.all_slots || [];

  // ============ EXTERNAL LINK (legacy) ============
  if (!isFunnelVideo) {
    const isLive = stateData.state === "live";
    const isEnded = stateData.state === "ended";
    return (
      <div className="min-h-[100dvh] bg-background">
        <div className="border-b border-border px-4 py-3"><Logo size="sm" /></div>
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-3">
            {isLive && <LiveDot />}
            <h1 className="text-2xl sm:text-3xl font-heading font-bold">{session.title}</h1>
            {session.description && <p className="text-sm text-muted-foreground">{session.description}</p>}
          </div>
          {!isEnded && countdown > 0 && (
            <div className="glass-card p-6 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Starts in</p>
              <p className="text-3xl sm:text-4xl font-heading font-bold text-primary tabular-nums">{formatCountdown(countdown)}</p>
            </div>
          )}
          {!isEnded && needsRegistration && !registered && (
            <RegistrationForm session={session} form={form} setForm={setForm} onSubmit={handleRegister} submitting={submitting} />
          )}
          {(isLive || (registered && !isEnded)) && stateData.meeting_url && (
            <Button variant="hero" size="lg" className="w-full" onClick={() => window.open(stateData.meeting_url!, "_blank")}>
              <ExternalLink size={16} /> {isLive ? "Join Live Session" : "Open Meeting Link"}
            </Button>
          )}
          {isEnded && <p className="text-center text-sm text-muted-foreground">This session has ended.</p>}
        </div>
      </div>
    );
  }

  // ============ FUNNEL VIDEO (simulated live) ============

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <Logo size="sm" />
        {(stateData.state === "live" || stateData.state === "replay") && (
          <button onClick={handleShareNative} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <Share2 size={14} /> Share
          </button>
        )}
      </div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Title & host */}
        <div className="text-center space-y-2">
          {stateData.state === "live" && <LiveDot label="LIVE NOW" />}
          {stateData.state === "replay" && (
            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">REPLAY</span>
          )}
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">{session.title}</h1>
          {session.description && <p className="text-sm text-muted-foreground max-w-xl mx-auto">{session.description}</p>}
          {speakerName && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {speakerPhoto && <img src={speakerPhoto} alt={speakerName} className="w-7 h-7 rounded-full object-cover" />}
              <span className="text-xs text-muted-foreground">Hosted by <span className="text-foreground font-medium">{speakerName}</span></span>
            </div>
          )}
        </div>

        {/* ===== STATE 1 — WAITING (Premium room) ===== */}
        {stateData.state === "waiting" && (
          <>
            {needsRegistration && !registered ? (
              <RegistrationForm session={session} form={form} setForm={setForm} onSubmit={handleRegister} submitting={submitting} />
            ) : (
              <div className="glass-card p-6 sm:p-8 text-center space-y-5">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Session begins in</p>
                  <p className="text-4xl sm:text-6xl font-heading font-bold text-primary tabular-nums leading-none">
                    {formatCountdown(countdown)}
                  </p>
                  {stateData.next_slot && (
                    <p className="text-xs text-muted-foreground mt-3">
                      <Calendar size={11} className="inline mr-1" />
                      {format(new Date(stateData.next_slot), "EEEE, MMM d 'at' h:mm a")}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
                  <Button variant="outline" size="sm" onClick={() => addToCalendar("google")}>
                    <CalendarPlus size={14} /> Google
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => addToCalendar("ics")}>
                    <CalendarPlus size={14} /> Apple/Outlook
                  </Button>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">Invite a friend</p>
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="text-emerald-500"><MessageCircle size={14} /> WhatsApp</Button>
                    <Button variant="outline" size="sm" onClick={handleCopy}><Copy size={14} /> Copy</Button>
                    {typeof navigator !== "undefined" && (navigator as any).share && (
                      <Button variant="outline" size="sm" onClick={handleShareNative}><Share2 size={14} /> Share</Button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Keep this tab open — the session will start automatically.
                </p>
              </div>
            )}

            {allSlots.length > 1 && (
              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">All upcoming sessions</p>
                <div className="flex flex-wrap gap-2">
                  {allSlots.slice(0, 12).map((iso) => {
                    const isNext = iso === stateData.next_slot;
                    return (
                      <span key={iso} className={`text-xs px-2 py-1 rounded-lg ${isNext ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>
                        {format(new Date(iso), "MMM d, h:mm a")}
                      </span>
                    );
                  })}
                  {allSlots.length > 12 && (
                    <span className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground">+{allSlots.length - 12} more</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* ===== STATE 2 — LIVE ===== */}
        {stateData.state === "live" && stateData.video_url && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video shadow-2xl">
              <video
                ref={videoRef}
                src={stateData.video_url}
                className="w-full h-full"
                autoPlay
                playsInline
                muted={muted}
                controls={false}
                onEnded={fetchState}
                onClick={() => {
                  const v = videoRef.current; if (!v) return;
                  if (v.paused) v.play(); else v.pause();
                }}
              />

              {/* Live badge */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-600 text-white text-[11px] font-bold shadow-lg">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                LIVE
              </div>

              {/* Viewers */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur text-white text-[11px] font-medium inline-flex items-center gap-1.5">
                <Users size={12} /> {(session.registration_count || 0) + fakeViewers} watching
              </div>

              {/* Tap-to-unmute overlay */}
              {muted && (
                <button
                  onClick={() => setMuted(false)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 group"
                >
                  <span className="px-4 py-2 rounded-full bg-white/95 text-black text-sm font-semibold inline-flex items-center gap-2 shadow-xl group-hover:scale-105 transition-transform">
                    <VolumeX size={16} /> Tap to unmute
                  </span>
                </button>
              )}

              {/* Custom controls bar (no scrub bar) */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center gap-3 select-none">
                <button
                  className="text-white hover:opacity-80 p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    const v = videoRef.current; if (!v) return;
                    if (v.paused) v.play(); else v.pause();
                  }}
                  aria-label={paused ? "Play" : "Pause"}
                >
                  {paused ? <Play size={20} /> : <Pause size={20} />}
                </button>
                <button className="text-white hover:opacity-80 p-1" onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }} aria-label={muted ? "Unmute" : "Mute"}>
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <span className="ml-auto text-[11px] text-white/80 font-medium">
                  Started {stateData.current_slot_start ? formatDistanceToNow(new Date(stateData.current_slot_start)) : ""} ago
                </span>
                <button className="text-white hover:opacity-80 p-1" onClick={(e) => { e.stopPropagation(); requestFullscreen(); }} aria-label="Fullscreen">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span>Live stream — forward seek and speed are disabled</span>
              <button onClick={handleShareNative} className="inline-flex items-center gap-1 hover:text-foreground"><Share2 size={12} /> Share</button>
            </div>
          </div>
        )}

        {/* ===== STATE 3 — ENDED ===== */}
        {stateData.state === "ended" && (
          <div className="glass-card p-8 text-center space-y-5">
            <div>
              <h3 className="text-xl font-heading font-bold mb-1">Thanks for watching!</h3>
              <p className="text-sm text-muted-foreground">This session has ended.</p>
            </div>

            {session.replay_enabled && countdown > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Replay available in</p>
                <p className="text-3xl font-heading font-bold text-primary tabular-nums">{formatCountdown(countdown)}</p>
              </div>
            )}

            {stateData.next_slot && (
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Next session</p>
                <p className="text-sm font-semibold">{format(new Date(stateData.next_slot), "EEE, MMM d 'at' h:mm a")}</p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => addToCalendar("google")}><CalendarPlus size={14} /> Add to calendar</Button>
                  <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="text-emerald-500"><MessageCircle size={14} /> Invite</Button>
                </div>
              </div>
            )}

            {!session.replay_enabled && !stateData.next_slot && (
              <p className="text-xs text-muted-foreground">No replay or further sessions are scheduled.</p>
            )}
          </div>
        )}

        {/* ===== STATE 4 — REPLAY ===== */}
        {stateData.state === "replay" && stateData.video_url && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden bg-black aspect-video shadow-2xl relative">
              <video
                ref={videoRef}
                src={stateData.video_url}
                className="w-full h-full"
                controls
                playsInline
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-emerald-500/90 text-white text-[11px] font-bold shadow">
                REPLAY
              </div>
            </div>
            {allSlots.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Originally aired: {format(new Date(allSlots[allSlots.length - 1]), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="text-emerald-500"><MessageCircle size={14} /> Share replay</Button>
              <Button variant="outline" size="sm" onClick={handleCopy}><Copy size={14} /> Copy link</Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-4">
          <p className="text-[10px] text-muted-foreground">Powered by <span className="text-primary font-semibold">nFlow</span></p>
        </div>
      </div>
    </div>
  );
};

const LiveDot = ({ label = "Live Now" }: { label?: string }) => (
  <div className="flex items-center justify-center gap-2">
    <span className="relative flex h-3 w-3">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
    </span>
    <span className="text-sm font-bold text-red-500 uppercase tracking-wider">{label}</span>
  </div>
);

const RegistrationForm = ({
  session, form, setForm, onSubmit, submitting,
}: {
  session: any;
  form: { name: string; phone: string; email: string; city: string };
  setForm: (f: any) => void;
  onSubmit: () => void;
  submitting: boolean;
}) => (
  <div className="glass-card p-6 space-y-4">
    <div className="text-center">
      <h3 className="font-heading font-semibold text-lg">Register to Join</h3>
      <p className="text-xs text-muted-foreground mt-1">Save your spot — we'll let you in when it starts.</p>
    </div>
    <div className="space-y-3">
      {session.show_name !== false && (
        <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-muted border-border" /></div>
      )}
      {session.show_phone !== false && (
        <div><Label className="text-xs">Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 bg-muted border-border" placeholder="+91" /></div>
      )}
      {session.show_email !== false && (
        <div><Label className="text-xs">Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-muted border-border" /></div>
      )}
      {session.show_city && (
        <div><Label className="text-xs">City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 bg-muted border-border" /></div>
      )}
    </div>
    <Button variant="hero" className="w-full" onClick={onSubmit} disabled={submitting}>
      {submitting ? "Registering..." : "Register & Continue"}
    </Button>
  </div>
);

export default PublicLivePage;
