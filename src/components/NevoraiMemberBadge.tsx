import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface NevoraiMemberBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

/**
 * Teal pill displayed next to plan label when the user is a Nevorai Member.
 * UI-only — does not affect access logic.
 */
export const NevoraiMemberBadge = ({ className, size = "sm" }: NevoraiMemberBadgeProps) => {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 border-[hsl(var(--member-border))] bg-[hsl(var(--member-muted))] text-member hover:bg-[hsl(var(--member-muted))]",
        size === "sm" ? "text-[10px] px-2 py-0" : "text-xs px-2.5 py-0.5",
        className,
      )}
    >
      <Sparkles size={size === "sm" ? 10 : 12} />
      Nevorai Member
    </Badge>
  );
};
