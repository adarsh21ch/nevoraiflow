import { useState, useEffect } from "react";
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

  // Update testimonial
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase
        .from("landing_page_testimonials")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["landing-page-testimonials", landingPageId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  const handleDelete = (id: string, type: string) => {
    const msg = type === "video"
      ? "Delete this testimonial? The video will be permanently removed."
      : "Delete this testimonial?";
    if (confirm(msg)) {
      deleteMutation.mutate(id);
    }
  };

  const renderTestimonialCard = (t: any) => {
    const initials = (t.student_name || "?")
      .split(" ")
      .map((w: string) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    return (
      <div key={t.id} className="p-4 bg-muted/50 rounded-xl space-y-3 border border-border">
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
                <Input
                  placeholder="Student name *"
                  value={t.student_name || ""}
                  onChange={(e) =>
                    updateMutation.mutate({ id: t.id, updates: { student_name: e.target.value } })
                  }
                  className="bg-muted border-border h-8 text-sm"
                />
              </div>
            </div>

            <Input
              placeholder="Location (optional, e.g. Mumbai, India)"
              value={t.student_location || ""}
              onChange={(e) =>
                updateMutation.mutate({ id: t.id, updates: { student_location: e.target.value } })
              }
              className="bg-muted border-border h-8 text-sm"
            />

            <ImageUploadField
              label="Student Photo"
              value={t.student_photo_url || ""}
              onChange={(url) =>
                updateMutation.mutate({ id: t.id, updates: { student_photo_url: url } })
              }
              bucket="landing-page-assets"
              folder="testimonial-photos"
              maxSizeMB={5}
            />

            {t.type === "text" && (
              <div>
                <Textarea
                  placeholder="Write the review text... (max 300 chars)"
                  value={t.review_text || ""}
                  maxLength={300}
                  onChange={(e) =>
                    updateMutation.mutate({ id: t.id, updates: { review_text: e.target.value } })
                  }
                  rows={3}
                  className="bg-muted border-border text-sm"
                />
                <p className="text-[10px] text-muted-foreground text-right mt-1">
                  {(t.review_text || "").length}/300
                </p>
              </div>
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
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="text-xs" onClick={() => {
                        // Clear video to allow re-upload
                        updateMutation.mutate({
                          id: t.id,
                          updates: { video_url: null, thumbnail_url: null, video_duration_seconds: null },
                        });
                      }}>
                        Replace video
                      </Button>
                    </div>
                  </div>
                ) : (
                  <VideoUploadBox
                    testimonialId={t.id}
                    landingPageId={landingPageId!}
                    maxSeconds={maxVideoSeconds}
                    onUploaded={(url, duration) => {
                      updateMutation.mutate({
                        id: t.id,
                        updates: { video_url: url, video_duration_seconds: duration },
                      });
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
                  onCheckedChange={(v) =>
                    updateMutation.mutate({ id: t.id, updates: { is_active: v } })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  {t.is_active ? "Visible" : "Hidden"}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-7"
                onClick={() => handleDelete(t.id, t.type)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                {textTestimonials.map(renderTestimonialCard)}

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

              {videoTestimonials.map(renderTestimonialCard)}

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
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB

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
      // Check duration client-side
      const duration = await getVideoDuration(file);
      if (duration > maxSeconds) {
        setError(`Your video is ${duration} seconds. Max allowed is ${maxSeconds} seconds.`);
        setUploading(false);
        return;
      }

      // Upload to Supabase storage (landing-page-assets bucket)
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `testimonial-videos/${landingPageId}/${testimonialId}.${ext}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 10, 90));
      }, 300);

      const { error: uploadError } = await supabase.storage
        .from("landing-page-assets")
        .upload(path, file, { cacheControl: "3600", upsert: true });

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
    <div className={`rounded-xl border-2 border-dashed p-4 ${error ? "border-destructive" : "border-border"}`}>
      {uploading ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="truncate">{fileName}</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">{progress}%</p>
        </div>
      ) : (
        <label className="flex flex-col items-center gap-2 cursor-pointer py-2">
          <Video size={24} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Upload video (MP4, MOV, WEBM)</span>
          <span className="text-[10px] text-muted-foreground/70">
            Max {maxSeconds} seconds · Max 100MB
          </span>
          <input
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
};
