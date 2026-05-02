import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Logo } from "@/components/landing/Logo";
import {
  Calendar, Clock, Users, ExternalLink, IndianRupee, Play, Pause, Volume2, VolumeX
} from "lucide-react";
import { format, formatDistanceToNow, isFuture } from "date-fns";

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
  const [muted, setMuted] = useState(true); // start muted to allow autoplay
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSeekRef = useRef<number>(0);

  // Fetch state from edge function
  const fetchState = useCallback(async () => {
    if (!slug) return;
    try {
      const { data, error } = await supabase.functions.invoke("get-live-session-state", {
        body: { slug },
      });
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

  // Poll every 30s
  useEffect(() => {
    const i = setInterval(fetchState, 30_000);
    return () => clearInterval(i);
  }, [fetchState]);

  // Local 1s countdown so the timer feels live
  useEffect(() => {
    if (!stateData || stateData.state !== "waiting") return;
    const i = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(i);
  }, [stateData]);

  // When entering LIVE state, set the video position
  useEffect(() => {
    if (!stateData || stateData.state !== "live" || !videoRef.current || !stateData.video_url) return;
    const v = videoRef.current;
    const targetSeek = stateData.seek_seconds;
    lastSeekRef.current = targetSeek;
    const apply = () => {
      try {
        if (Math.abs(v.currentTime - targetSeek) > 2) v.currentTime = targetSeek;
        v.play().catch(() => {});
      } catch (_) { /* ignore */ }
    };
    if (v.readyState >= 1) apply();
    else v.addEventListener("loadedmetadata", apply, { once: true });
  }, [stateData?.state, stateData?.video_url, stateData?.seek_seconds]);

  // Lock seeking forward + force re-sync on play after pause (live state only)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !stateData || stateData.state !== "live") return;

    const onSeeking = () => {
      // Compute live position from current_slot_start
      if (!stateData.current_slot_start) return;
      const livePos = Math.max(0, Math.floor((Date.now() - new Date(stateData.current_slot_start).getTime()) / 1000));
      // Allow rewind but block forward seek beyond live position
      if (v.currentTime > livePos + 1) {
        v.currentTime = Math.max(0, livePos);
      }
    };
    const onPlay = () => {
      // Force re-sync to live position when user un-pauses
      if (!stateData.current_slot_start) return;
      const livePos = Math.max(0, Math.floor((Date.now() - new Date(stateData.current_slot_start).getTime()) / 1000));
      if (Math.abs(v.currentTime - livePos) > 3) {
        v.currentTime = livePos;
      }
    };
    v.addEventListener("seeking", onSeeking);
    v.addEventListener("play", onPlay);
    return () => {
      v.removeEventListener("seeking", onSeeking);
      v.removeEventListener("play", onPlay);
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
    toast.success("You're registered!");
    // refresh registration_count
    fetchState();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    );
  }
  if (!stateData) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Logo size="lg" />
        <h1 className="text-xl font-heading font-bold">Session Not Found</h1>
        <p className="text-sm text-muted-foreground">This session may have been removed or hasn't been published yet.</p>
      </div>
    );
  }

  const session = stateData.session;
  const funnel = stateData.funnel_data;
  const needsRegistration = session.access_type === "lead_gated" || session.access_type === "paid";
  const isFunnelVideo = stateData.session_type === "funnel_video";

  // ============ EXTERNAL LINK (legacy) ============
  if (!isFunnelVideo) {
    const isLive = stateData.state === "live";
    const isEnded = stateData.state === "ended";
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border px-4 py-3"><Logo size="sm" /></div>
        <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-3">
            {isLive && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Live Now</span>
              </div>
            )}
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
  const speakerName = funnel?.speaker_name;
  const speakerPhoto = funnel?.speaker_photo_url;
  const allSlots = stateData.all_slots || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border px-4 py-3"><Logo size="sm" /></div>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

        {/* Title */}
        <div className="text-center space-y-2">
          {stateData.state === "live" && (
            <div className="flex items-center justify-center gap-2 mb-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
              </span>
              <span className="text-sm font-bold text-red-500 uppercase tracking-wider">Live Now</span>
            </div>
          )}
          {stateData.state === "replay" && (
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-500">REPLAY</span>
          )}
          <h1 className="text-2xl sm:text-3xl font-heading font-bold">{session.title}</h1>
          {session.description && <p className="text-sm text-muted-foreground">{session.description}</p>}
          {speakerName && (
            <div className="flex items-center justify-center gap-2 pt-1">
              {speakerPhoto && <img src={speakerPhoto} alt={speakerName} className="w-7 h-7 rounded-full object-cover" />}
              <span className="text-xs text-muted-foreground">Hosted by <span className="text-foreground font-medium">{speakerName}</span></span>
            </div>
          )}
        </div>

        {/* STATE 1 — WAITING */}
        {stateData.state === "waiting" && (
          <>
            {needsRegistration && !registered ? (
              <RegistrationForm session={session} form={form} setForm={setForm} onSubmit={handleRegister} submitting={submitting} />
            ) : (
              <div className="glass-card p-8 text-center space-y-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Session starts in</p>
                <p className="text-4xl sm:text-5xl font-heading font-bold text-primary tabular-nums">{formatCountdown(countdown)}</p>
                <p className="text-xs text-muted-foreground">
                  This session will begin automatically. Keep this tab open.
                </p>
              </div>
            )}
            {allSlots.length > 0 && (
              <div className="glass-card p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">All sessions</p>
                <div className="flex flex-wrap gap-2">
                  {allSlots.map((iso) => {
                    const isNext = iso === stateData.next_slot;
                    return (
                      <span key={iso} className={`text-xs px-2 py-1 rounded-lg ${isNext ? "bg-primary/15 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>
                        {format(new Date(iso), "MMM d, h:mm a")}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* STATE 2 — LIVE */}
        {stateData.state === "live" && stateData.video_url && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                src={stateData.video_url}
                className="w-full h-full"
                autoPlay
                playsInline
                muted={muted}
                controls={false}
                onEnded={fetchState}
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-600/90 text-white text-[11px] font-bold">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                </span>
                LIVE
              </div>
              {/* Custom controls — pause/play + mute only, no seek */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-3">
                <button
                  className="text-white hover:opacity-80"
                  onClick={() => {
                    const v = videoRef.current; if (!v) return;
                    if (v.paused) v.play(); else v.pause();
                  }}
                >
                  {videoRef.current?.paused ? <Play size={20} /> : <Pause size={20} />}
                </button>
                <button className="text-white hover:opacity-80" onClick={() => setMuted((m) => !m)}>
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <span className="ml-auto text-[11px] text-white/80">
                  Started {stateData.current_slot_start ? formatDistanceToNow(new Date(stateData.current_slot_start)) : ""} ago
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Watching live with {(session.registration_count || 0) + 1} others • Forward seek is disabled
            </p>
          </div>
        )}

        {/* STATE 3 — ENDED */}
        {stateData.state === "ended" && (
          <div className="glass-card p-8 text-center space-y-4">
            <h3 className="text-lg font-heading font-semibold">This session has ended</h3>
            {session.replay_enabled && countdown > 0 ? (
              <>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Replay available in</p>
                <p className="text-3xl font-heading font-bold text-primary tabular-nums">{formatCountdown(countdown)}</p>
              </>
            ) : !session.replay_enabled ? (
              <p className="text-sm text-muted-foreground">Thank you for watching.</p>
            ) : null}
            {stateData.next_slot && (
              <p className="text-xs text-muted-foreground">
                Next session: {format(new Date(stateData.next_slot), "MMM d 'at' h:mm a")}
              </p>
            )}
          </div>
        )}

        {/* STATE 4 — REPLAY */}
        {stateData.state === "replay" && stateData.video_url && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden bg-black aspect-video">
              <video
                src={stateData.video_url}
                className="w-full h-full"
                controls
                playsInline
              />
            </div>
            {allSlots.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Originally aired: {format(new Date(allSlots[allSlots.length - 1]), "MMM d, yyyy 'at' h:mm a")}
              </p>
            )}
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
    <h3 className="font-heading font-semibold text-center">Register to Join</h3>
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
