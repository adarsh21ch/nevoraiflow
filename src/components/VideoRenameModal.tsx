import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  videoId: string;
  currentTitle: string;
  onSuccess: () => void;
}

export const VideoRenameModal = ({ open, onClose, videoId, currentTitle, onSuccess }: Props) => {
  const [title, setTitle] = useState(currentTitle);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) setTitle(currentTitle);
  }, [open, currentTitle]);

  const handleRename = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("video_assets")
        .update({ title: title.trim() })
        .eq("id", videoId);
      if (error) throw error;
      toast.success("Video renamed!");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to rename");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Pencil size={16} /> Rename Video
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 bg-muted border-border"
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
            />
          </div>
          <Button onClick={handleRename} disabled={!title.trim() || loading} className="w-full" variant="hero">
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
