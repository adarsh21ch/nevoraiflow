import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Video, Lock, Clock, MessageSquare, Music } from "lucide-react";
import { getStepTypeMeta } from "./StepTypeSelector";

interface FlowStep {
  id?: string;
  step_order: number;
  title: string;
  description: string;
  step_type: string;
  video_asset_id: string | null;
  is_active: boolean;
  unlock_rule_type: string;
  unlock_rule_value: string;
  cta_text: string;
  cta_url: string;
  booking_url: string;
  unlock_timer_minutes?: number;
  between_step_audio_url?: string;
  between_step_audio_enabled?: boolean;
  between_step_message?: string;
  between_step_message_enabled?: boolean;
  unlock_after_percent?: number;
}

interface StepConfigPanelProps {
  open: boolean;
  onClose: () => void;
  step: FlowStep | null;
  stepIndex: number;
  onUpdate: (key: keyof FlowStep, value: any) => void;
  onOpenVideoPicker: () => void;
  totalSteps: number;
}

const UNLOCK_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: "auto", label: "Immediately", description: "Unlocks right away" },
  { value: "watch_complete", label: "After full video watch", description: "Previous video must be watched to 95%+" },
  { value: "watch_seconds", label: "After watching X seconds", description: "Specify how many seconds" },
  { value: "watch_percent", label: "After watching X percent", description: "Specify what percentage" },
  { value: "cta_click", label: "After CTA click", description: "Previous step's CTA must be clicked" },
  { value: "lead_submitted", label: "After form submitted", description: "Lead form must be filled out" },
  { value: "payment_submitted", label: "After payment submitted", description: "Payment proof must be submitted" },
  { value: "manual", label: "Manual unlock by you", description: "You decide when to unlock this step" },
  { value: "booking_done", label: "After booking completed", description: "Booking/call must be marked done" },
];

export const StepConfigPanel = ({ open, onClose, step, stepIndex, onUpdate, onOpenVideoPicker, totalSteps }: StepConfigPanelProps) => {
  if (!step) return null;
  const meta = getStepTypeMeta(step.step_type);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md bg-card border-border overflow-y-auto">
        <SheetHeader className="mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center`}>
              <meta.icon size={18} className={meta.color} />
            </div>
            <div>
              <SheetTitle className="font-heading text-base">Step {stepIndex + 1} · {meta.label}</SheetTitle>
              <SheetDescription className="text-xs">{meta.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Title — always shown */}
          <div>
            <Label className="text-sm font-medium">Step Title</Label>
            <Input
              value={step.title}
              onChange={(e) => onUpdate("title", e.target.value)}
              placeholder={`e.g. ${step.step_type === "video" ? "Watch the Intro" : step.step_type === "lead_form" ? "Enter Your Details" : step.step_type === "cta" ? "Visit Our Page" : step.step_type === "payment" ? "Complete Payment" : step.step_type === "booking" ? "Book Your Call" : "Awaiting Approval"}`}
              className="mt-1.5 bg-muted border-border"
            />
          </div>

          {/* VIDEO fields */}
          {step.step_type === "video" && (
            <>
              <div>
                <Label className="text-sm font-medium">Video</Label>
                {step.video_asset_id ? (
                  <div className="flex items-center gap-2 mt-1.5 p-3 rounded-lg bg-muted border border-border">
                    <Video size={16} className="text-primary shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">Video selected ✓</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenVideoPicker}>Change</Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="mt-1.5 w-full" onClick={onOpenVideoPicker}>
                    <Video size={14} /> Select Video
                  </Button>
                )}
              </div>
              <div>
                <Label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={step.description}
                  onChange={(e) => onUpdate("description", e.target.value)}
                  placeholder="Brief description shown below the video..."
                  className="mt-1.5 bg-muted border-border"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* LEAD FORM fields */}
          {step.step_type === "lead_form" && (
            <div>
              <Label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={step.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                placeholder="Tell the viewer why to fill the form..."
                className="mt-1.5 bg-muted border-border"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Lead form fields are configured in your funnel's Lead Capture settings.
              </p>
            </div>
          )}

          {/* CTA fields */}
          {step.step_type === "cta" && (
            <>
              <div>
                <Label className="text-sm font-medium">Button Text</Label>
                <Input
                  value={step.cta_text}
                  onChange={(e) => onUpdate("cta_text", e.target.value)}
                  placeholder="e.g. Visit Our Page, Join WhatsApp"
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Destination URL</Label>
                <Input
                  value={step.cta_url}
                  onChange={(e) => onUpdate("cta_url", e.target.value)}
                  placeholder="https://... or WhatsApp link"
                  className="mt-1.5 bg-muted border-border"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Paste any URL — website, WhatsApp, Instagram, Telegram, etc.
                </p>
              </div>
              <div>
                <Label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={step.description}
                  onChange={(e) => onUpdate("description", e.target.value)}
                  placeholder="Why should they click?"
                  className="mt-1.5 bg-muted border-border"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* PAYMENT fields */}
          {step.step_type === "payment" && (
            <div>
              <Label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea
                value={step.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                placeholder="Payment instructions for the viewer..."
                className="mt-1.5 bg-muted border-border"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Payment details (UPI ID, QR code) are configured in your funnel's Payment settings.
              </p>
            </div>
          )}

          {/* BOOKING fields */}
          {step.step_type === "booking" && (
            <>
              <div>
                <Label className="text-sm font-medium">Booking Link</Label>
                <Input
                  value={step.booking_url}
                  onChange={(e) => onUpdate("booking_url", e.target.value)}
                  placeholder="Calendly, Zoom, Google Meet, or any URL"
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Button Text</Label>
                <Input
                  value={step.cta_text}
                  onChange={(e) => onUpdate("cta_text", e.target.value)}
                  placeholder="e.g. Book Your Call"
                  className="mt-1.5 bg-muted border-border"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Textarea
                  value={step.description}
                  onChange={(e) => onUpdate("description", e.target.value)}
                  placeholder="What will this call be about?"
                  className="mt-1.5 bg-muted border-border"
                  rows={2}
                />
              </div>
            </>
          )}

          {/* MANUAL APPROVAL fields */}
          {step.step_type === "manual_approval" && (
            <div>
              <Label className="text-sm font-medium">Internal Note <span className="text-muted-foreground font-normal">(only you see this)</span></Label>
              <Textarea
                value={step.description}
                onChange={(e) => onUpdate("description", e.target.value)}
                placeholder="e.g. Unlock after WhatsApp conversation..."
                className="mt-1.5 bg-muted border-border"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-2">
                The viewer will see a "Waiting for approval" message. You can unlock this step from the Lead Progress tab.
              </p>
            </div>
          )}

          {/* Unlock rule — only for steps after first */}
          {stepIndex > 0 && (
            <div className="pt-4 border-t border-border">
              <Label className="text-sm font-medium flex items-center gap-1.5 mb-2">
                <Lock size={12} className="text-muted-foreground" />
                When should this step unlock?
              </Label>
              <Select value={step.unlock_rule_type} onValueChange={(v) => onUpdate("unlock_rule_type", v)}>
                <SelectTrigger className="bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {UNLOCK_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      <span>{r.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(step.unlock_rule_type === "watch_seconds" || step.unlock_rule_type === "watch_percent") && (
                <Input
                  type="number"
                  value={step.unlock_rule_value}
                  onChange={(e) => onUpdate("unlock_rule_value", e.target.value)}
                  placeholder={step.unlock_rule_type === "watch_seconds" ? "Number of seconds" : "Percentage (0–100)"}
                  className="mt-2 bg-muted border-border"
                />
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {UNLOCK_OPTIONS.find((r) => r.value === step.unlock_rule_type)?.description}
              </p>
            </div>
          )}

          {/* Enhanced: Time-based unlock timer */}
          {stepIndex < totalSteps - 1 && (
            <div className="pt-4 border-t border-border space-y-4">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Clock size={12} className="text-muted-foreground" />
                After Completing This Step
              </Label>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Time delay before next step (minutes)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={0}
                    value={step.unlock_timer_minutes || 0}
                    onChange={(e) => onUpdate("unlock_timer_minutes" as keyof FlowStep, parseInt(e.target.value) || 0)}
                    className="w-24 bg-muted border-border"
                  />
                  <span className="text-xs text-muted-foreground">0 = no delay</span>
                </div>
              </div>

              {/* Between-step audio */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Music size={12} className="text-muted-foreground" />
                    Audio Note (between steps)
                  </Label>
                  <Switch
                    checked={step.between_step_audio_enabled || false}
                    onCheckedChange={(v) => onUpdate("between_step_audio_enabled" as keyof FlowStep, v)}
                  />
                </div>
                {step.between_step_audio_enabled && (
                  <Input
                    value={step.between_step_audio_url || ""}
                    onChange={(e) => onUpdate("between_step_audio_url" as keyof FlowStep, e.target.value)}
                    placeholder="Audio file URL (MP3, M4A)"
                    className="bg-muted border-border"
                  />
                )}
              </div>

              {/* Between-step text message */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <MessageSquare size={12} className="text-muted-foreground" />
                    Text Message (between steps)
                  </Label>
                  <Switch
                    checked={step.between_step_message_enabled || false}
                    onCheckedChange={(v) => onUpdate("between_step_message_enabled" as keyof FlowStep, v)}
                  />
                </div>
                {step.between_step_message_enabled && (
                  <Textarea
                    value={step.between_step_message || ""}
                    onChange={(e) => onUpdate("between_step_message" as keyof FlowStep, e.target.value)}
                    placeholder="Message shown while waiting for next step..."
                    className="bg-muted border-border"
                    rows={3}
                  />
                )}
              </div>
            </div>
          )}

          {/* Active toggle */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Step Active</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Inactive steps are hidden from viewers</p>
              </div>
              <Switch checked={step.is_active} onCheckedChange={(v) => onUpdate("is_active", v)} />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
