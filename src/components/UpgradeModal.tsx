import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Lock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  type: "upgrade" | "limit";
  resource?: string;
  currentCount?: number;
  limit?: number;
  tier?: string;
}

export const UpgradeModal = ({ open, onClose, type, resource, currentCount, limit, tier }: UpgradeModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[400px] rounded-2xl text-center p-8">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            {type === "upgrade" ? (
              <Crown className="text-primary" size={24} />
            ) : (
              <Lock className="text-primary" size={24} />
            )}
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg font-heading font-bold">
              {type === "upgrade"
                ? "This feature requires a subscription"
                : "You've reached your limit"}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {type === "upgrade"
                ? "Free accounts can only view shared content. Subscribe to start creating."
                : `Your ${tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : ""} plan allows up to ${limit} ${resource || "items"}. Upgrade to create more.`}
            </DialogDescription>
            {type === "limit" && currentCount !== undefined && limit !== undefined && (
              <p className="text-xs text-muted-foreground mt-1">
                Currently using <span className="font-semibold text-foreground">{currentCount}</span> of{" "}
                <span className="font-semibold text-foreground">{limit}</span>
              </p>
            )}
          </DialogHeader>

          <div className="flex flex-col gap-2 w-full mt-2">
            <Button
              className="w-full gap-2"
              onClick={() => { onClose(); navigate("/pricing"); }}
            >
              {type === "upgrade" ? "See Plans" : "Upgrade Plan"} <ArrowRight size={14} />
            </Button>
            <button
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClose}
            >
              {type === "upgrade" ? "Not now" : "Maybe later"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
