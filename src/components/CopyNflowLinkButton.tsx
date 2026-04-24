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
    toast.success("Link copied!", {
      description: "Paste it into nFlow → Videos → Add by nFlow Link to reuse this video.",
    });
  };

  return (
    <Button
      variant="outline"
      size={size}
      onClick={handleCopy}
      className={`gap-2 ${className}`}
      title="Copy nFlow Link to reuse this video in your funnel"
    >
      <Copy size={14} />
      <span>Copy nFlow Link</span>
    </Button>
  );
};
