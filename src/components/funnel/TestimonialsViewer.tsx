import { useState, useRef, useEffect, useCallback } from "react";
import { Star, Volume2, VolumeX, Play, ChevronRight } from "lucide-react";

interface Testimonial {
  id: string;
  type: string;
  student_name: string;
  student_location?: string;
  student_photo_url?: string;
  review_text?: string;
  video_url?: string;
  thumbnail_url?: string;
  video_duration_seconds?: number;
}

interface TestimonialsViewerProps {
  testimonials: Testimonial[];
  sectionTitle: string;
}

export const TestimonialsViewer = ({ testimonials, sectionTitle }: TestimonialsViewerProps) => {
  const textItems = testimonials.filter((t) => t.type === "text");
  const videoItems = testimonials.filter((t) => t.type === "video" && t.video_url);

  if (textItems.length === 0 && videoItems.length === 0) return null;

  return (
    <div className="space-y-8">
      <h2 className="text-[22px] font-semibold text-center">{sectionTitle}</h2>

      {/* Text testimonials */}
      {textItems.length > 0 && <TextTestimonialsRow items={textItems} />}

      {/* Video testimonials */}
      {videoItems.length > 0 && <VideoTestimonialsSection items={videoItems} />}
    </div>
  );
};

// ── Text testimonials horizontal scroll ──
const TextTestimonialsRow = ({ items }: { items: Testimonial[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - (scrollRef.current?.offsetLeft || 0));
    setScrollLeft(scrollRef.current?.scrollLeft || 0);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    scrollRef.current.scrollLeft = scrollLeft - (x - startX);
  };

  const initials = (name: string) =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide cursor-grab"
      style={{ scrollBehavior: "smooth", WebkitOverflowScrolling: "touch" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {items.map((t) => {
        const text = t.review_text || "";
        const isLong = text.length > 160;
        const isExpanded = expandedId === t.id;

        return (
          <div
            key={t.id}
            className="snap-start shrink-0 w-[280px] rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3"
          >
            <div className="flex items-center gap-3">
              {t.student_photo_url ? (
                <img
                  src={t.student_photo_url}
                  alt={t.student_name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-background"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  {initials(t.student_name || "?")}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold truncate">{t.student_name}</p>
                {t.student_location && (
                  <p className="text-xs text-muted-foreground truncate">{t.student_location}</p>
                )}
              </div>
            </div>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} size={14} className="fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isLong && !isExpanded ? text.slice(0, 160) + "..." : text}
              {isLong && (
                <button
                  className="text-primary text-xs ml-1 hover:underline"
                  onClick={() => setExpandedId(isExpanded ? null : t.id)}
                >
                  {isExpanded ? "show less" : "read more"}
                </button>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
};

// ── Video testimonials section ──
const VideoTestimonialsSection = ({ items }: { items: Testimonial[] }) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [mutedMap, setMutedMap] = useState<Record<number, boolean>>(() => {
    const m: Record<number, boolean> = {};
    items.forEach((_, i) => (m[i] = true));
    return m;
  });

  const toggleMute = (idx: number) => {
    setMutedMap((prev) => {
      const next: Record<number, boolean> = {};
      // Mute all others when unmuting one
      items.forEach((_, i) => (next[i] = i === idx ? !prev[i] : true));
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-base font-semibold">Video Reviews</h3>
      <div
        className="flex md:flex-row flex-col gap-3 md:overflow-x-auto md:pb-2 md:snap-x md:snap-mandatory scrollbar-hide"
        style={{ scrollBehavior: "smooth" }}
      >
        {items.map((t, i) => (
          <VideoCard
            key={t.id}
            testimonial={t}
            index={i}
            isActive={activeIdx === i}
            isMuted={mutedMap[i] ?? true}
            onPlay={() => setActiveIdx(i)}
            onToggleMute={() => toggleMute(i)}
            onEnded={() => {
              if (i < items.length - 1) {
                setTimeout(() => setActiveIdx(i + 1), 1500);
              }
            }}
            isSingle={items.length === 1}
          />
        ))}
      </div>
    </div>
  );
};

// ── Individual video card ──
interface VideoCardProps {
  testimonial: Testimonial;
  index: number;
  isActive: boolean;
  isMuted: boolean;
  onPlay: () => void;
  onToggleMute: () => void;
  onEnded: () => void;
  isSingle: boolean;
}

const VideoCard = ({
  testimonial: t,
  index,
  isActive,
  isMuted,
  onPlay,
  onToggleMute,
  onEnded,
  isSingle,
}: VideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);

  // IntersectionObserver auto-play
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            onPlay();
          } else if (!entry.isIntersecting) {
            if (videoRef.current) {
              videoRef.current.pause();
              setPlaying(false);
            }
          }
        });
      },
      { threshold: 0.7 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Play/pause based on isActive
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive) {
      videoRef.current.play().catch(() => {});
      setPlaying(true);
      setEnded(false);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [isActive]);

  // Mute sync
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = isMuted;
  }, [isMuted]);

  // Progress bar
  useEffect(() => {
    if (!videoRef.current) return;
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (v && v.duration) {
        setProgress((v.currentTime / v.duration) * 100);
      }
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const handleClick = () => {
    if (!playing) {
      onPlay();
    } else if (videoRef.current) {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const duration = t.video_duration_seconds || 0;
  const durationStr = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, "0")}`;

  const initials = (t.student_name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={containerRef}
      className="relative shrink-0 rounded-2xl overflow-hidden cursor-pointer group
        w-full md:w-[220px] aspect-[9/16] md:h-[390px]
        bg-black hover:scale-[1.02] transition-transform duration-200"
      onClick={handleClick}
    >
      <video
        ref={videoRef}
        src={t.video_url || ""}
        poster={t.thumbnail_url || undefined}
        muted={isMuted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        onEnded={() => {
          setEnded(true);
          setPlaying(false);
          onEnded();
        }}
      />

      {/* Gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)",
        }}
      />

      {/* Mute button - top left */}
      <button
        className="absolute top-3 left-3 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white"
        onClick={(e) => {
          e.stopPropagation();
          onToggleMute();
        }}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Duration badge - top right */}
      {duration > 0 && (
        <span className="absolute top-3 right-3 text-[11px] text-white bg-black/50 px-2 py-0.5 rounded-full">
          {durationStr}
        </span>
      )}

      {/* Play button center */}
      {!playing && !ended && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-14 h-14 rounded-full bg-white/85 backdrop-blur flex items-center justify-center">
            <Play size={24} className="text-black ml-1" />
          </div>
        </div>
      )}

      {/* Ended overlay */}
      {ended && !isSingle && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
          <div className="text-center text-white">
            <p className="text-xs opacity-70 mb-1">Up Next</p>
            <ChevronRight size={32} />
          </div>
        </div>
      )}

      {/* Bottom info */}
      <div className="absolute bottom-4 left-3 right-3 z-10 flex items-center gap-2">
        {t.student_photo_url ? (
          <img
            src={t.student_photo_url}
            alt={t.student_name}
            className="w-8 h-8 rounded-full object-cover border border-white/30"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/40 text-white flex items-center justify-center text-[10px] font-bold">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-white text-[13px] font-bold truncate">{t.student_name}</p>
          {t.student_location && (
            <p className="text-white/60 text-[11px] truncate">{t.student_location}</p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20 z-10">
        <div
          className="h-full bg-white transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
