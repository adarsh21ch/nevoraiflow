import { Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FunnelDailyLimitGateProps {
  limit?: number;
  currentCount?: number;
}

/**
 * Shown to public viewers when a funnel has hit its daily view cap.
 * The limit is applied based on the funnel owner's plan — viewers don't
 * see the underlying number unless we choose to show it.
 */
export const FunnelDailyLimitGate = ({ limit, currentCount }: FunnelDailyLimitGateProps) => {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
          <Lock className="text-muted-foreground" size={28} />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-heading font-semibold">Content unavailable right now</h1>
          <p className="text-sm text-muted-foreground">
            This page has reached its daily view limit. Please come back tomorrow.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Clock size={12} />
          Resets at midnight IST
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    </div>
  );
};
