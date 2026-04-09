import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  MessageSquare, Video, Plus, Trash2, Star, Loader2, Upload, Play, X,
} from "lucide-react";
import { toast } from "sonner";
import { TestimonialPhotoUpload } from "@/components/funnel/TestimonialPhotoUpload";

interface TestimonialsBuilderStepProps {
  landingPageId: string | undefined;
  userId: string;
  testimonialsEnabled: boolean;
  testimonialsSectionTitle: string;
  onToggleEnabled: (v: boolean) => void;
  onTitleChange: (v: string) => void;
}

// Debounced input that keeps local state and only saves after user stops typing
const DebouncedInput = memo(({
  value: externalValue,
  onSave,
  placeholder,
  className,
}: {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const [localValue, setLocalValue] = useState(externalValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  // Sync from external only if not currently editing
  useEffect(() => {
    setLocalValue(externalValue);
  }, [externalValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSaveRef.current(val), 600);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <Input
      placeholder={placeholder}
      value={localValue}
      onChange={handleChange}
      className={className}
    />
  );
});
DebouncedInput.displayName = "DebouncedInput";

const DebouncedTextarea = memo(({
  value: externalValue,
  onSave,
  placeholder,
  className,
  maxLength,
  rows,
}: {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  rows?: number;
}) => {
  const [localValue, setLocalValue] = useState(externalValue);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  useEffect(() => {
    setLocalValue(externalValue);
  }, [externalValue]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => onSaveRef.current(val), 600);
  }, []);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div>
      <Textarea
        placeholder={placeholder}
        value={localValue}
        maxLength={maxLength}
        onChange={handleChange}
        rows={rows}
        className={className}
      />
      {maxLength && (
        <p className="text-[10px] text-muted-foreground text-right mt-1">
          {localValue.length}/{maxLength}
        </p>
      )}
    </div>
  );
});
DebouncedTextarea.displayName = "DebouncedTextarea";

export const TestimonialsBuilderStep = ({
  landingPageId,
  userId,
  testimonialsEnabled,
  testimonialsSectionTitle,
  onToggleEnabled,
  onTitleChange,
}: TestimonialsBuilderStepProps) => {
  const queryClient = useQueryClient();

  // Fetch platform settings for limits
  const { data: platformSettings = [] } = useQuery({
    queryKey: ["platform-settings-testimonials"],
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings")
        .select("key,value")
        .in("key", [
          "testimonial_max_video_seconds",
          "testimonial_max_per_page",
          "testimonial_video_feature_enabled",
        ]);
      return data || [];
    },
    staleTime: 60000,
  });

  const getSetting = (key: string, fallback: string) =>
    platformSettings.find((s) => s.key === key)?.value || fallback;

  const maxPerPage = parseInt(getSetting("testimonial_max_per_page", "8"), 10);
  const maxVideoSeconds = parseInt(getSetting("testimonial_max_video_seconds", "60"), 10);
  const videoFeatureEnabled = getSetting("testimonial_video_feature_enabled", "true") === "true";

  // Fetch existing testimonials
  const { data: testimonials = [], isLoading } = useQuery({
    queryKey: ["landing-page-testimonials", landingPageId],
    queryFn: async () => {
      if (!landingPageId) return [];
      const { data } = await supabase
        .from("landing_page_testimonials")
        .select("*")
        .eq("landing_page_id", landingPageId)
        .order("display_order", { ascending: true });
      return data || [];
    },
    enabled: !!landingPageId,
    staleTime: 10000,
  });

  const textTestimonials = testimonials.filter((t: any) => t.type === "text");
  const totalCount = testimonials.length;
  const limitReached = totalCount >= maxPerPage;

  // Add testimonial mutation
  const addMutation = useMutation({
    mutationFn: async (type: "text" | "video") => {
      if (!landingPageId) {
        throw new Error("Please save the landing page first before adding testimonials.");
      }
      const { error } = await supabase.from("landing_page_testimonials").insert({
        landing_page_id: landingPageId,
        owner_id: userId,
        type,
        student_name: "",
        display_order: totalCount,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-page-testimonials", landingPageId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Update testimonial — no query invalidation, optimistic local
  const updateField = useCallback(async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from("landing_page_testimonials")
      .update(updates as any)
      .eq("id", id);
    if (error) toast.error(error.message);
  }, []);

  // For changes that need UI refresh (photo, toggle, video)
  const updateAndRefresh = useCallback(async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase
      .from("landing_page_testimonials")
      .update(updates as any)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
    } else {
      queryClient.invalidateQueries({ queryKey: ["landing-page-testimonials", landingPageId] });
    }
  }, [landingPageId, queryClient]);

  // Delete testimonial
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("landing_page_testimonials")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-page-testimonials", landingPageId] });
      toast.success("Testimonial deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleDelete = useCallback((id: string, type: string) => {
    const msg = type === "video"
      ? "Delete this testimonial? The video will be permanently removed."
      : "Delete this testimonial?";
    if (confirm(msg)) {
      deleteMutation.mutate(id);
    }
  }, [deleteMutation]);

  if (!landingPageId) {
    return (
      <>
        <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
          <Star size={18} className="text-primary" /> Testimonials
        </h2>
        <p className="text-sm text-muted-foreground">
          Save the landing page first to add testimonials.
        </p>
      </>
    );
  }

  return (
    <>
      <h2 className="text-lg font-heading font-semibold flex items-center gap-2">
        <Star size={18} className="text-primary" /> Testimonials
      </h2>
      <p className="text-sm text-muted-foreground">
        Add text and video testimonials to show social proof after registration.
      </p>

      <div className="space-y-4 mt-4">
        {/* Enable toggle */}
        <div className="p-4 bg-muted/50 rounded-xl flex items-center justify-between">
          <div>
            <Label className="font-semibold">Enable Testimonials Section</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Show testimonials on the post-registration page
            </p>
          </div>
          <Switch checked={testimonialsEnabled} onCheckedChange={onToggleEnabled} />
        </div>

        <div className={!testimonialsEnabled ? "opacity-50 pointer-events-none" : ""}>
          {/* Section title */}
          <div className="p-4 bg-muted/50 rounded-xl space-y-2">
            <Label>Section Title</Label>
            <Input
              value={testimonialsSectionTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="What our members say"
              className="bg-muted border-border"
            />
          </div>

          {/* All Testimonials */}
          <div className="mt-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Star size={14} className="text-primary" /> All Testimonials ({totalCount}/{maxPerPage})
            </h3>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={16} className="animate-spin" /> Loading...
              </div>
            ) : (
              <>
                {testimonials.map((t: any) => (
                  <UnifiedTestimonialCard
                    key={t.id}
                    testimonial={t}
                    onUpdateField={updateField}
                    onUpdateAndRefresh={updateAndRefresh}
                    onDelete={handleDelete}
                    landingPageId={landingPageId}
                    maxVideoSeconds={maxVideoSeconds}
                  />
                ))}

                <Button
                  variant="outline"
                  className="w-full"
                  disabled={limitReached || addMutation.isPending}
                  onClick={() => addMutation.mutate("text" as "text" | "video")}
                  title={limitReached ? `Maximum ${maxPerPage} testimonials reached` : ""}
                >
                  <Plus size={14} className="mr-1.5" />
                  {addMutation.isPending ? "Adding..." : "Add Testimonial"}
                </Button>
                {limitReached && (
                  <p className="text-xs text-destructive">
                    Maximum {maxPerPage} testimonials reached. Remove one to add another.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Unified Testimonial Card ──
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const MAX_VIDEO_SIZE_MB = 250;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

const formatDuration = (s?: number | null) => {
  if (!s && s !== 0) return null;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

const getVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => { resolve(Math.round(video.duration)); URL.revokeObjectURL(url); };
    video.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Cannot read video")); };
    video.src = url;
  });

const generateThumbnail = (file: File): Promise<Blob | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(Math.max(video.duration * 0.15, 0.1), video.duration - 0.1);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, 960 / video.videoHeight);
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, "image/jpeg", 0.82);
      } catch { URL.revokeObjectURL(url); resolve(null); }
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    video.src = url;
  });

const UnifiedTestimonialCard = memo(({
  testimonial: t,
  onUpdateField,
  onUpdateAndRefresh,
  onDelete,
  landingPageId,
  maxVideoSeconds,
}: {
  testimonial: any;
  onUpdateField: (id: string, updates: Record<string, any>) => void;
  onUpdateAndRefresh: (id: string, updates: Record<string, any>) => void;
  onDelete: (id: string, type: string) => void;
  landingPageId: string;
  maxVideoSeconds: number;
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const videoInputRef = useRef<HTMLInputElement>(null);

  const handleTypeSwitch = useCallback((newType: "text" | "video") => {
    if (t.type === newType) return;
    onUpdateAndRefresh(t.id, {
      type: newType,
      review_text: newType === "video" ? null : t.review_text,
      video_url: newType === "text" ? null : t.video_url,
      thumbnail_url: newType === "text" ? null : t.thumbnail_url,
      video_duration_seconds: newType === "text" ? null : t.video_duration_seconds,
    });
  }, [t, onUpdateAndRefresh]);

  const handleVideoFile = useCallback(async (file: File) => {
    setError("");
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) { setError("Only MP4, MOV, WEBM supported."); return; }
    if (file.size > MAX_VIDEO_SIZE_BYTES) { setError(`Max size is ${MAX_VIDEO_SIZE_MB}MB.`); return; }

    setUploading(true);
    setProgress(5);

    try {
      const duration = await getVideoDuration(file);
      if (duration > maxVideoSeconds) throw new Error(`Video is ${duration}s. Max is ${maxVideoSeconds}s.`);

      setProgress(15);

      // Generate thumbnail
      let uploadedThumbUrl: string | null = null;
      const thumbBlob = await generateThumbnail(file);
      if (thumbBlob) {
        const thumbPath = `testimonial-thumbnails/${landingPageId}/${t.id}-${Date.now()}.jpg`;
        const { error: te } = await supabase.storage.from("landing-page-assets").upload(thumbPath, thumbBlob, { cacheControl: "3600", upsert: false, contentType: "image/jpeg" });
        if (!te) uploadedThumbUrl = supabase.storage.from("landing-page-assets").getPublicUrl(thumbPath).data.publicUrl;
      }

      setProgress(30);

      // Upload video to Supabase Storage
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const videoPath = `testimonial-videos/${landingPageId}/${t.id}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from("landing-page-assets").upload(videoPath, file, { cacheControl: "3600", upsert: false, contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message || "Video upload failed");

      const publicUrl = supabase.storage.from("landing-page-assets").getPublicUrl(videoPath).data.publicUrl;

      setProgress(100);
      onUpdateAndRefresh(t.id, { video_url: publicUrl, thumbnail_url: uploadedThumbUrl, video_duration_seconds: duration });
      toast.success("Video uploaded!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  }, [t.id, landingPageId, maxVideoSeconds, onUpdateAndRefresh]);

  const durationLabel = formatDuration(t.video_duration_seconds);

  return (
    <div className="p-4 bg-muted/50 rounded-xl space-y-3 border border-border">
      {/* Row 1: Photo + Name + Location */}
      <div className="flex items-start gap-3">
        <TestimonialPhotoUpload
          value={t.student_photo_url || ""}
          onChange={(url) => onUpdateAndRefresh(t.id, { student_photo_url: url })}
          landingPageId={landingPageId}
          testimonialId={t.id}
          studentName={t.student_name || "Student"}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <DebouncedInput
            value={t.student_name || ""}
            onSave={(val) => onUpdateField(t.id, { student_name: val })}
            placeholder="Student name *"
            className="bg-muted border-border h-8 text-sm"
          />
          <DebouncedInput
            value={t.student_location || ""}
            onSave={(val) => onUpdateField(t.id, { student_location: val })}
            placeholder="Location (e.g. Mumbai, India)"
            className="bg-muted border-border h-8 text-sm"
          />
        </div>
      </div>

      {/* Row 2: Type toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTypeSwitch("text")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            t.type === "text"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare size={12} /> Text
        </button>
        <button
          type="button"
          onClick={() => handleTypeSwitch("video")}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            t.type === "video"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          <Video size={12} /> Video
        </button>
      </div>

      {/* Row 3: Content area based on type */}
      {t.type === "text" && (
        <DebouncedTextarea
          value={t.review_text || ""}
          onSave={(val) => onUpdateField(t.id, { review_text: val })}
          placeholder="Write the review text... (max 300 chars)"
          maxLength={300}
          rows={3}
          className="bg-muted border-border text-sm"
        />
      )}

      {t.type === "video" && (
        <div>
          <input
            ref={videoInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleVideoFile(f); }}
          />

          {t.video_url ? (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card/60 p-3">
              <div className="relative w-16 h-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                {t.thumbnail_url ? (
                  <img src={t.thumbnail_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <video src={t.video_url} className="h-full w-full object-cover" preload="metadata" muted playsInline />
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-background/30">
                  <Play size={14} className="text-white" />
                </div>
                {durationLabel && (
                  <span className="absolute bottom-1 right-1 rounded bg-background/80 px-1 text-[9px] font-medium">{durationLabel}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground font-medium truncate">Video uploaded ✓</p>
                <div className="flex gap-2 mt-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-6 text-[11px] px-2" onClick={() => videoInputRef.current?.click()}>
                    Replace
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[11px] px-2 text-destructive hover:text-destructive" onClick={() => onUpdateAndRefresh(t.id, { video_url: null, thumbnail_url: null, video_duration_seconds: null })}>
                    <X size={11} className="mr-0.5" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div>
              {uploading ? (
                <div className="rounded-lg border border-border bg-card/60 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>Uploading video… {progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3 text-left transition-colors hover:bg-muted/60 hover:border-primary/40"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Upload size={16} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">Upload video</p>
                    <p className="text-[10px] text-muted-foreground">MP4, MOV, WEBM • Max {maxVideoSeconds}s • {MAX_VIDEO_SIZE_MB}MB</p>
                  </div>
                </button>
              )}
              {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
            </div>
          )}
        </div>
      )}

      {/* Row 4: Visible toggle + delete */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Switch checked={t.is_active} onCheckedChange={(v) => onUpdateAndRefresh(t.id, { is_active: v })} />
          <span className="text-xs text-muted-foreground">{t.is_active ? "Visible" : "Hidden"}</span>
        </div>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive h-7" onClick={() => onDelete(t.id, t.type)}>
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
});
UnifiedTestimonialCard.displayName = "UnifiedTestimonialCard";
