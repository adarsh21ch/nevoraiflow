import { useState, useEffect, useCallback, useRef, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ImageUploadField } from "@/components/ui/image-upload-field";
import {
  MessageSquare, Video, Plus, Trash2, GripVertical, Star, Loader2,
} from "lucide-react";
import { toast } from "sonner";

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
  const videoTestimonials = testimonials.filter((t: any) => t.type === "video");
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

          {/* Text Testimonials */}
          <div className="mt-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare size={14} className="text-primary" /> Text Testimonials
            </h3>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 size={16} className="animate-spin" /> Loading...
              </div>
            ) : (
              <>
                {textTestimonials.map((t: any) => (
                  <TestimonialCard
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
                  onClick={() => addMutation.mutate("text")}
                  title={limitReached ? `Maximum ${maxPerPage} testimonials reached` : ""}
                >
                  <Plus size={14} className="mr-1.5" />
                  {addMutation.isPending ? "Adding..." : "Add Text Testimonial"}
                </Button>
                {limitReached && (
                  <p className="text-xs text-amber-500">
                    Maximum {maxPerPage} testimonials reached. Remove one to add another.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Video Testimonials */}
          {videoFeatureEnabled && (
            <div className="mt-6 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Video size={14} className="text-primary" /> Video Testimonials
              </h3>

              {videoTestimonials.map((t: any) => (
                <TestimonialCard
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
                onClick={() => addMutation.mutate("video")}
                title={limitReached ? `Maximum ${maxPerPage} testimonials reached` : ""}
              >
                <Plus size={14} className="mr-1.5" />
                {addMutation.isPending ? "Adding..." : "Add Video Testimonial"}
              </Button>
              {limitReached && (
                <p className="text-xs text-amber-500">
                  Maximum {maxPerPage} testimonials reached. Remove one to add another.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Testimonial Card (memoized) ──
const TestimonialCard = memo(({
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
  const initials = (t.student_name || "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="p-4 bg-muted/50 rounded-xl space-y-3 border border-border">
      <div className="flex items-start gap-3">
        <div className="mt-1 cursor-grab text-muted-foreground">
          <GripVertical size={16} />
        </div>
        <div className="flex-1 space-y-3">
          {/* Photo + name row */}
          <div className="flex items-center gap-3">
            {t.student_photo_url ? (
              <img
                src={t.student_photo_url}
                alt={t.student_name}
                className="w-9 h-9 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                {initials || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <DebouncedInput
                value={t.student_name || ""}
                onSave={(val) => onUpdateField(t.id, { student_name: val })}
                placeholder="Student name *"
                className="bg-muted border-border h-8 text-sm"
              />
            </div>
          </div>

          <DebouncedInput
            value={t.student_location || ""}
            onSave={(val) => onUpdateField(t.id, { student_location: val })}
            placeholder="Location (optional, e.g. Mumbai, India)"
            className="bg-muted border-border h-8 text-sm"
          />

          <ImageUploadField
            label="Student Photo"
            value={t.student_photo_url || ""}
            onChange={(url) => onUpdateAndRefresh(t.id, { student_photo_url: url })}
            bucket="landing-page-assets"
            folder="testimonial-photos"
            maxSizeMB={5}
          />

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
            <div className="space-y-2">
              {t.video_url ? (
                <div className="space-y-2">
                  <div className="relative rounded-lg overflow-hidden bg-black" style={{ width: 240, height: 135 }}>
                    {t.thumbnail_url ? (
                      <img src={t.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <video src={t.video_url} className="w-full h-full object-cover" />
                    )}
                    {t.video_duration_seconds && (
                      <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-full">
                        {Math.floor(t.video_duration_seconds / 60)}:{String(t.video_duration_seconds % 60).padStart(2, "0")}
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                    onUpdateAndRefresh(t.id, { video_url: null, thumbnail_url: null, video_duration_seconds: null });
                  }}>
                    Replace video
                  </Button>
                </div>
              ) : (
                <VideoUploadBox
                  testimonialId={t.id}
                  landingPageId={landingPageId}
                  maxSeconds={maxVideoSeconds}
                  onUploaded={(url, duration) => {
                    onUpdateAndRefresh(t.id, { video_url: url, video_duration_seconds: duration });
                  }}
                />
              )}
            </div>
          )}

          {/* Bottom row: active toggle + delete */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={t.is_active}
                onCheckedChange={(v) => onUpdateAndRefresh(t.id, { is_active: v })}
              />
              <span className="text-xs text-muted-foreground">
                {t.is_active ? "Visible" : "Hidden"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive h-7"
              onClick={() => onDelete(t.id, t.type)}
            >
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});
TestimonialCard.displayName = "TestimonialCard";

// ── Video Upload Box ──
interface VideoUploadBoxProps {
  testimonialId: string;
  landingPageId: string;
  maxSeconds: number;
  onUploaded: (url: string, duration: number) => void;
}

const VideoUploadBox = ({ testimonialId, landingPageId, maxSeconds, onUploaded }: VideoUploadBoxProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
  const MAX_SIZE = 100 * 1024 * 1024;

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(Math.round(video.duration));
        URL.revokeObjectURL(video.src);
      };
      video.onerror = () => reject(new Error("Could not read video metadata"));
      video.src = URL.createObjectURL(file);
    });
  };

  const handleFile = async (file: File) => {
    setError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only MP4, MOV, and WEBM files are supported.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("File too large. Maximum size is 100MB.");
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setProgress(0);

    try {
      const duration = await getVideoDuration(file);
      if (duration > maxSeconds) {
        setError(`Your video is ${duration} seconds. Max allowed is ${maxSeconds} seconds.`);
        setUploading(false);
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `testimonial-videos/${landingPageId}/${testimonialId}.${ext}`;

      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 300);

      const { error: uploadError } = await supabase.storage
        .from("landing-page-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("landing-page-assets")
        .getPublicUrl(path);

      setProgress(100);
      onUploaded(publicUrl, duration);
      toast.success("Video uploaded!");
    } catch (err: any) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${error ? "border-destructive bg-destructive/5" : "border-border hover:border-primary/50"}`}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {uploading ? (
        <div className="space-y-2">
          <Loader2 size={24} className="animate-spin mx-auto text-primary" />
          <p className="text-xs text-muted-foreground">{fileName}</p>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      ) : (
        <>
          <Video size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">
            Upload video (MP4, MOV, WEBM)
          </p>
          <p className="text-[10px] text-muted-foreground">
            Max {maxSeconds} seconds · Max 100MB
          </p>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            id={`video-upload-${testimonialId}`}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="mt-2 text-xs"
            onClick={() =>
              document.getElementById(`video-upload-${testimonialId}`)?.click()
            }
          >
            Choose file
          </Button>
        </>
      )}
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
};
