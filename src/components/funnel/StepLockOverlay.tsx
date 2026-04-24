import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

interface Props {
  /** The actual step UI rendered behind a blur — gives users a teaser. */
  children: ReactNode;
  /** Display name of the gated feature, e.g. "Lead Capture". */
  featureName: string;
  /** Plan that unlocks this feature, e.g. "Basic" or "Pro". */
  requiredPlan: "Basic" | "Pro";
  /** Price label shown on CTA, e.g. "₹199/mo". */
  priceLabel: string;
}

/**
 * Renders the real step settings, blurred and non-interactive, with a
 * centered upgrade card on top. Used in FunnelEditor when a free/basic
 * user clicks a step their plan doesn't unlock.
 */
export const StepLockOverlay = ({ children, featureName, requiredPlan, priceLabel }: Props) => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Blurred + frozen real settings underneath — gives a teaser of what's inside */}
      <div
        aria-hidden
        className="pointer-events-none select-none blur-sm opacity-50 max-h-[520px] overflow-hidden"
      >
        {children}
      </div>

      {/* Upgrade card overlay */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-xl p-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock size={20} className="text-primary" />
          </div>
          <h3 className="text-base font-heading font-bold mb-2">
            Upgrade to unlock {featureName}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            This feature is available on the {requiredPlan} plan and above. Upgrade now to capture
            leads, add speaker profiles, and more.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="hero"
              size="sm"
              onClick={() => navigate("/pricing")}
              className="w-full gap-2"
            >
              <Sparkles size={14} />
              Upgrade to {requiredPlan} — {priceLabel}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            7-day money-back guarantee · cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};
