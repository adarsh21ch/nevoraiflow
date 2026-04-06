import { Play, ClipboardList, ExternalLink, CreditCard, UserCheck, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const STEP_TYPES = [
  {
    value: "video",
    label: "Video",
    icon: Play,
    description: "Show a video and unlock the next step after watching",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    value: "lead_form",
    label: "Lead Form",
    icon: ClipboardList,
    description: "Collect lead details before continuing",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    value: "cta",
    label: "CTA / Link",
    icon: ExternalLink,
    description: "Send the viewer to WhatsApp, website, or any action page",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    value: "payment",
    label: "Payment",
    icon: CreditCard,
    description: "Show payment instructions or collect payment proof",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    value: "booking",
    label: "Booking / Call",
    icon: Calendar,
    description: "Ask the viewer to book or attend a call before continuing",
    color: "text-pink-400",
    bg: "bg-pink-500/10",
  },
  {
    value: "manual_approval",
    label: "Manual Approval",
    icon: UserCheck,
    description: "Only unlock the next step when you approve manually",
    color: "text-orange-400",
    bg: "bg-orange-500/10",
  },
] as const;

interface StepTypeSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: string) => void;
}

export const StepTypeSelector = ({ open, onClose, onSelect }: StepTypeSelectorProps) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">What should this step do?</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Choose the type of step to add to your journey.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 mt-2">
          {STEP_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => { onSelect(type.value); onClose(); }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-lg ${type.bg} flex items-center justify-center shrink-0`}>
                <type.icon size={20} className={type.color} />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  {type.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const getStepTypeMeta = (type: string) => {
  return STEP_TYPES.find((t) => t.value === type) || STEP_TYPES[0];
};
