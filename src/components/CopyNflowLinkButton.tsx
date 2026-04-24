import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface Props {
  videoId: string;
  className?: string;
  size?: "sm" | "default" | "lg";
}

/**
 * Viewer-facing button that lets any visitor copy the nFlow video link
 * so they can paste it into their own gallery via "Add by nFlow Link".
 * Only render when the video's `allow_copy_link` is true.
 */
export const CopyNflowLinkButton = ({ videoId, className = "", size = "sm" }: Props) => {
  const handleCopy = () => {
    const url = `${window.location.origin}/video/${videoId}`;
    navigator.clipboard.writeText(url);
    toast.success("Video link copied!", {
      description: "Open nFlow → Funnels → Add by Link and paste it to use this video in your funnel.",
    });
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleCopy}
      className={`gap-2 ${className}`}
      title="Use this video in your funnel"
    >
      <Copy size={14} />
      <span>Use this video in your funnel</span>
    </Button>
  );
};
