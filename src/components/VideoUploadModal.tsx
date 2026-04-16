import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { uploadVideoToR2 } from "@/lib/r2VideoUpload";
import { toast } from "sonner";
import { Upload, X, FileVideo, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const VideoUploadModal = ({ open, onClose, onSuccess }: Props) => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setProgress(0);
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    if (f.size > 500 * 1024 * 1024) {
      toast.error("Video must be under 500MB");
      return;
    }

    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!user || !file || !title.trim()) return;
    setUploading(true);
    setProgress(0);

    try {
      await uploadVideoToR2({
        file,
        title: title.trim(),
        onProgress: setProgress,
      });

      toast.success("Video uploaded successfully!");
      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClose = () => {
    if (uploading) return;
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Upload Video</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />

          {!file ? (
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 transition-colors"
            >
              <Upload size={32} className="text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Tap to select a video file
              </span>
              <span className="text-xs text-muted-foreground/60">
                Max 500MB · MP4, MOV, WebM
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <FileVideo size={20} className="text-primary shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              {!uploading && (
                <button onClick={() => { setFile(null); setTitle(""); }} className="text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              )}
            </div>
          )}

          <div>
            <Label>Video Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter video title"
              className="mt-1 bg-muted border-border"
              disabled={uploading}
            />
          </div>

          <div>
            <Label>Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="mt-1 bg-muted border-border resize-none"
              rows={2}
              disabled={uploading}
            />
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!file || !title.trim() || uploading}
            className="w-full"
            variant="hero"
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> Uploading... {progress}%</>
            ) : (
              <><Upload size={16} /> Upload Video</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
