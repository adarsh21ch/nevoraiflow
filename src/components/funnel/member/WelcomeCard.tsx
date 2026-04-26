import { Button } from "@/components/ui/button";
import { Play, Sparkles } from "lucide-react";

interface WelcomeCardProps {
  memberName: string;
  speakerName?: string | null;
  speakerPhotoUrl?: string | null;
  welcomeMessage?: string | null;
  onContinue: () => void;
  continueLabel?: string;
  isDark?: boolean;
}

export const WelcomeCard = ({
  memberName,
  speakerName,
  speakerPhotoUrl,
  welcomeMessage,
  onContinue,
  continueLabel = "Continue where you left off",
  isDark = true,
}: WelcomeCardProps) => {
  const sc = {
    cardBg: isDark ? "#141419" : "#ffffff",
    border: isDark ? "#27272a" : "#e5e7eb",
    text: isDark ? "#ffffff" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
  };

  const firstName = memberName?.trim().split(/\s+/)[0] || "there";
  const initial = (speakerName || "N").trim().charAt(0).toUpperCase();

  return (
    <div
      className="rounded-2xl p-6 sm:p-8 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${sc.cardBg}, hsl(var(--primary) / 0.08))`,
        border: `1px solid ${sc.border}`,
      }}
    >
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)" }} />

      <div className="relative flex items-start gap-4 sm:gap-5">
        {speakerPhotoUrl ? (
          <img
            src={speakerPhotoUrl}
            alt={speakerName || "Creator"}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover flex-shrink-0 ring-2 ring-primary/40"
          />
        ) : (
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ring-2 ring-primary/40"
            style={{ background: "hsl(var(--primary) / 0.15)", color: "hsl(var(--primary))" }}
          >
            {initial}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles size={14} className="text-primary" />
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: sc.muted }}>
              Welcome back
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: sc.text }}>
            Hi {firstName} 👋
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: sc.muted }}>
            {welcomeMessage ||
              `${speakerName ? speakerName + " is" : "We're"} excited to have you here. Pick up where you left off and keep moving forward.`}
          </p>
        </div>
      </div>

      <Button
        onClick={onContinue}
        className="mt-5 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
      >
        <Play size={16} className="mr-2" />
        {continueLabel}
      </Button>
    </div>
  );
};
