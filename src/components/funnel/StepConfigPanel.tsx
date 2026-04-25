import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Video,
  Lock,
  Clock,
  MessageSquare,
  Music,
  User,
  ListChecks,
  Plus,
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  ChevronDown,
  Info,
  Layers,
  Power,
} from "lucide-react";
import { getStepTypeMeta } from "./StepTypeSelector";
import { SpeakerPhotoUpload } from "./SpeakerPhotoUpload";

export interface FlowStep {
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
  // Upgraded unlock model
  unlock_condition?: string; // 'full_watch' | 'percentage' | 'time_spent'
  unlock_percentage?: number;
  // Waiting period gate
  time_delay_enabled?: boolean;
  time_delay_minutes?: number;
  // Timer CTA shown during wait
  timer_cta_enabled?: boolean;
  timer_cta_text?: string;
  timer_cta_url?: string;
  timer_cta_style?: string;
  // Per-step Key Points
  video_topics_step_enabled?: boolean;
  video_topics_step?: Array<{ icon: string; text: string }>;
  // Per-step access code
  access_code_enabled?: boolean;
  access_code_plain?: string;
  access_code_hash?: string | null;
  access_code_message?: string;
  _access_code_raw?: string;
  // Per-step speaker
  speaker_mode_step?: string; // 'inherit' | 'override' | 'none' | 'account' | 'custom'
  speaker_name_custom?: string;
  speaker_title?: string;
  speaker_bio?: string;
  speaker_photo_url_custom?: string;
}

interface StepConfigPanelProps {
  open: boolean;
  onClose: () => void;
  step: FlowStep | null;
  stepIndex: number;
  onUpdate: (key: keyof FlowStep, value: any) => void;
  onOpenVideoPicker: () => void;
  totalSteps: number;
  speakerScope?: string;
  videoTopicsScope?: string;
  userProfile?: { full_name?: string; avatar_url?: string; bio?: string } | null;
}

// Map upgraded unlock_condition → legacy unlock_rule_type/value so
// existing viewers, analytics and saved funnels keep working.
const mapConditionToLegacy = (
  condition: string,
  percentage?: number
): { unlock_rule_type: string; unlock_rule_value: string } => {
  switch (condition) {
    case "full_watch":
      return { unlock_rule_type: "watch_complete", unlock_rule_value: "" };
    case "percentage":
      return { unlock_rule_type: "watch_percent", unlock_rule_value: String(percentage || 80) };
    case "time_spent":
      return { unlock_rule_type: "watch_seconds", unlock_rule_value: String((percentage || 10) * 60) };
    default:
      return { unlock_rule_type: "watch_complete", unlock_rule_value: "" };
  }
};

const SectionHeader = ({
  icon: Icon,
  label,
  isOpen,
  onToggle,
  summary,
}: {
  icon: any;
  label: string;
  isOpen: boolean;
  onToggle: () => void;
  summary?: string;
}) => (
  <button onClick={onToggle} className="w-full flex items-center justify-between py-3 text-left group">
    <div className="flex items-center gap-2">
      <Icon size={13} className="text-muted-foreground" />
      <span className="text-[13px] font-medium text-foreground">{label}</span>
      {summary && !isOpen && <span className="text-[10px] text-muted-foreground ml-1">· {summary}</span>}
    </div>
    <ChevronDown size={14} className={`text-muted-foreground transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`} />
  </button>
);

export const StepConfigPanel = ({
  open,
  onClose,
  step,
  stepIndex,
  onUpdate,
  onOpenVideoPicker,
  totalSteps,
  speakerScope,
  videoTopicsScope,
  userProfile,
}: StepConfigPanelProps) => {
  const [showAccessCode, setShowAccessCode] = useState(false);
  const [extraGatesOpen, setExtraGatesOpen] = useState(false);
  const [betweenStepsOpen, setBetweenStepsOpen] = useState(false);

  if (!step) return null;
  const meta = getStepTypeMeta(step.step_type);

  const topics = step.video_topics_step || [];
  const addTopic = () => {
    if (topics.length < 10)
      onUpdate("video_topics_step" as keyof FlowStep, [...topics, { icon: "✅", text: "" }]);
  };
  const removeTopic = (i: number) =>
    onUpdate("video_topics_step" as keyof FlowStep, topics.filter((_, idx) => idx !== i));
  const updateTopicText = (i: number, text: string) =>
    onUpdate(
      "video_topics_step" as keyof FlowStep,
      topics.map((t, idx) => (idx === i ? { ...t, text: text.slice(0, 100) } : t))
    );

  const handleUnlockConditionChange = (condition: string) => {
    onUpdate("unlock_condition" as keyof FlowStep, condition);
    const legacy = mapConditionToLegacy(condition, step.unlock_percentage);
    onUpdate("unlock_rule_type", legacy.unlock_rule_type);
    onUpdate("unlock_rule_value", legacy.unlock_rule_value);
  };

  const handleUnlockPercentageChange = (val: number) => {
    onUpdate("unlock_percentage" as keyof FlowStep, val);
    const legacy = mapConditionToLegacy(step.unlock_condition || "percentage", val);
    onUpdate("unlock_rule_type", legacy.unlock_rule_type);
    onUpdate("unlock_rule_value", legacy.unlock_rule_value);
  };

  const extraGatesSummary =
    [
      step.time_delay_enabled && `${step.time_delay_minutes || 30}m wait`,
      step.access_code_enabled && "Code",
    ]
      .filter(Boolean)
      .join(" · ") || undefined;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md bg-card border-border flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center`}>
              <meta.icon size={18} className={meta.color} />
            </div>
            <div>
              <SheetTitle className="font-heading text-base">
                Step {stepIndex + 1} · {meta.label}
              </SheetTitle>
              <SheetDescription className="text-xs">{meta.description}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-0">
            {/* SECTION A — Step Info */}
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-3">
                <Info size={13} className="text-muted-foreground" />
                <span className="text-[13px] font-medium text-foreground">Step Info</span>
              </div>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Step Title</Label>
                  <Input
                    value={step.title}
                    onChange={(e) => onUpdate("title", e.target.value)}
                    placeholder={`e.g. ${
                      step.step_type === "video"
                        ? "Watch the Intro"
                        : step.step_type === "lead_form"
                        ? "Enter Your Details"
                        : step.step_type === "cta"
                        ? "Visit Our Page"
                        : step.step_type === "payment"
                        ? "Complete Payment"
                        : step.step_type === "booking"
                        ? "Book Your Call"
                        : "Awaiting Approval"
                    }`}
                    className="mt-1 bg-muted border-border h-10"
                  />
                </div>

                {step.step_type === "video" && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Video</Label>
                      {step.video_asset_id ? (
                        <div className="flex items-center gap-2 mt-1 p-3 rounded-lg bg-muted border border-border">
                          <Video size={16} className="text-primary shrink-0" />
                          <span className="text-sm text-foreground flex-1 truncate">Video selected ✓</span>
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onOpenVideoPicker}>
                            Change
                          </Button>
                        </div>
                      ) : (
                        <Button variant="outline" size="sm" className="mt-1 w-full" onClick={onOpenVideoPicker}>
                          <Video size={14} /> Select Video
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Description <span className="font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        value={step.description}
                        onChange={(e) => onUpdate("description", e.target.value)}
                        placeholder="Brief description shown below the video..."
                        className="mt-1 bg-muted border-border"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {step.step_type === "lead_form" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Description <span className="font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => onUpdate("description", e.target.value)}
                      placeholder="Tell the viewer why to fill the form..."
                      className="mt-1 bg-muted border-border"
                      rows={2}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Lead form fields are configured in your funnel's Lead Capture settings.
                    </p>
                  </div>
                )}
                {step.step_type === "cta" && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Button Text</Label>
                      <Input
                        value={step.cta_text}
                        onChange={(e) => onUpdate("cta_text", e.target.value)}
                        placeholder="e.g. Visit Our Page"
                        className="mt-1 bg-muted border-border h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Destination URL</Label>
                      <Input
                        value={step.cta_url}
                        onChange={(e) => onUpdate("cta_url", e.target.value)}
                        placeholder="https://..."
                        className="mt-1 bg-muted border-border h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Description <span className="font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        value={step.description}
                        onChange={(e) => onUpdate("description", e.target.value)}
                        placeholder="Why should they click?"
                        className="mt-1 bg-muted border-border"
                        rows={2}
                      />
                    </div>
                  </>
                )}
                {step.step_type === "payment" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Description <span className="font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => onUpdate("description", e.target.value)}
                      placeholder="Payment instructions..."
                      className="mt-1 bg-muted border-border"
                      rows={2}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Payment details are in Payment settings.
                    </p>
                  </div>
                )}
                {step.step_type === "booking" && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Booking Link</Label>
                      <Input
                        value={step.booking_url}
                        onChange={(e) => onUpdate("booking_url", e.target.value)}
                        placeholder="Calendly, Zoom, etc."
                        className="mt-1 bg-muted border-border h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Button Text</Label>
                      <Input
                        value={step.cta_text}
                        onChange={(e) => onUpdate("cta_text", e.target.value)}
                        placeholder="Book Your Call"
                        className="mt-1 bg-muted border-border h-10"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        Description <span className="font-normal">(optional)</span>
                      </Label>
                      <Textarea
                        value={step.description}
                        onChange={(e) => onUpdate("description", e.target.value)}
                        placeholder="What will this call be about?"
                        className="mt-1 bg-muted border-border"
                        rows={2}
                      />
                    </div>
                  </>
                )}
                {step.step_type === "manual_approval" && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Internal Note</Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => onUpdate("description", e.target.value)}
                      placeholder="e.g. Unlock after WhatsApp conversation..."
                      className="mt-1 bg-muted border-border"
                      rows={2}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      Viewer sees "Waiting for approval". Unlock from Lead Progress tab.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* SECTION B — Unlock Condition */}
            {stepIndex > 0 && (
              <div className="py-4 border-t border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Lock size={13} className="text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">Unlock Condition</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">When should this step become available?</p>

                <div className="flex rounded-xl border border-border overflow-hidden">
                  {(["full_watch", "percentage", "time_spent"] as const).map((cond) => (
                    <button
                      key={cond}
                      onClick={() => handleUnlockConditionChange(cond)}
                      className={`flex-1 py-2 text-xs font-semibold transition-all ${
                        (step.unlock_condition || "full_watch") === cond
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {cond === "full_watch" ? "▶ Full Watch" : cond === "percentage" ? "% Percentage" : "⏱ Time Spent"}
                    </button>
                  ))}
                </div>

                {(step.unlock_condition || "full_watch") === "full_watch" && (
                  <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg mt-3">
                    Next step unlocks only after the previous video is watched completely (100%).
                  </p>
                )}

                {(step.unlock_condition || "full_watch") === "percentage" && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs text-muted-foreground">
                      Unlock after watching __% of previous video
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={step.unlock_percentage ?? 80}
                      onChange={(e) =>
                        handleUnlockPercentageChange(Math.min(99, Math.max(1, parseInt(e.target.value) || 80)))
                      }
                      className="w-24 bg-muted border-border h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Step {stepIndex + 1} unlocks when viewer watches {step.unlock_percentage ?? 80}% of Step {stepIndex}
                    </p>
                  </div>
                )}

                {(step.unlock_condition || "full_watch") === "time_spent" && (
                  <div className="space-y-2 mt-3">
                    <Label className="text-xs text-muted-foreground">
                      Unlock after viewer spends __ minutes on previous step
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={999}
                      value={step.unlock_percentage ?? 10}
                      onChange={(e) =>
                        handleUnlockPercentageChange(Math.min(999, Math.max(1, parseInt(e.target.value) || 10)))
                      }
                      className="w-24 bg-muted border-border h-10"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Counts time the viewer has the step open, regardless of watch %
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* SECTION C — Extra Gates */}
            {stepIndex > 0 && (
              <div className="border-t border-border">
                <Collapsible
                  open={extraGatesOpen || step.time_delay_enabled || step.access_code_enabled}
                  onOpenChange={setExtraGatesOpen}
                >
                  <CollapsibleTrigger asChild>
                    <div>
                      <SectionHeader
                        icon={ShieldCheck}
                        label="Extra Gates"
                        isOpen={extraGatesOpen || !!(step.time_delay_enabled || step.access_code_enabled)}
                        onToggle={() => setExtraGatesOpen(!extraGatesOpen)}
                        summary={extraGatesSummary}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pb-4 space-y-4">
                      {/* Waiting period */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <Clock size={11} className="text-muted-foreground" />
                              Waiting period after unlock
                            </Label>
                          </div>
                          <Switch
                            checked={step.time_delay_enabled ?? false}
                            onCheckedChange={(v) => {
                              onUpdate("time_delay_enabled" as keyof FlowStep, v);
                              if (v && !step.time_delay_minutes) {
                                onUpdate("time_delay_minutes" as keyof FlowStep, 30);
                              }
                            }}
                          />
                        </div>
                        {step.time_delay_enabled && (
                          <div className="space-y-3 pl-6">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Wait</span>
                              <Input
                                type="number"
                                min={1}
                                value={step.time_delay_minutes || 30}
                                onChange={(e) =>
                                  onUpdate("time_delay_minutes" as keyof FlowStep, parseInt(e.target.value) || 30)
                                }
                                className="w-20 bg-muted border-border h-9"
                              />
                              <span className="text-xs text-muted-foreground">minutes</span>
                            </div>

                            {/* Timer CTA */}
                            <div className="space-y-3 pt-2 border-t border-border">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium">CTA during wait</Label>
                                <Switch
                                  checked={step.timer_cta_enabled ?? false}
                                  onCheckedChange={(v) => onUpdate("timer_cta_enabled" as keyof FlowStep, v)}
                                />
                              </div>
                              {step.timer_cta_enabled && (
                                <div className="space-y-2">
                                  <Input
                                    value={step.timer_cta_text || ""}
                                    onChange={(e) =>
                                      onUpdate("timer_cta_text" as keyof FlowStep, e.target.value)
                                    }
                                    placeholder="e.g. Contact your mentor →"
                                    className="bg-muted border-border h-9"
                                  />
                                  <Input
                                    value={step.timer_cta_url || ""}
                                    onChange={(e) =>
                                      onUpdate("timer_cta_url" as keyof FlowStep, e.target.value)
                                    }
                                    placeholder="https://wa.me/91..."
                                    className="bg-muted border-border h-9"
                                  />
                                  <div className="flex rounded-lg border border-border overflow-hidden">
                                    {(["gold", "white", "outline"] as const).map((s) => (
                                      <button
                                        key={s}
                                        onClick={() => onUpdate("timer_cta_style" as keyof FlowStep, s)}
                                        className={`flex-1 py-1.5 text-[10px] font-semibold transition-all ${
                                          (step.timer_cta_style || "gold") === s
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                      >
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Access Code Gate */}
                      <div className="space-y-3 pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-xs font-medium flex items-center gap-1.5">
                              <ShieldCheck size={11} className="text-muted-foreground" />
                              Access Code Gate
                            </Label>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Require a code to view this step
                            </p>
                          </div>
                          <Switch
                            checked={step.access_code_enabled ?? false}
                            onCheckedChange={(v) => onUpdate("access_code_enabled" as keyof FlowStep, v)}
                          />
                        </div>
                        {step.access_code_enabled && (
                          <div className="space-y-3 pl-6 animate-in slide-in-from-top-2 duration-200">
                            <div>
                              <Label className="text-xs text-muted-foreground">Access Code</Label>
                              <div className="relative mt-1">
                                <Input
                                  type={showAccessCode ? "text" : "password"}
                                  value={step._access_code_raw || ""}
                                  onChange={(e) =>
                                    onUpdate(
                                      "_access_code_raw" as keyof FlowStep,
                                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20)
                                    )
                                  }
                                  placeholder={
                                    step.access_code_hash || step.access_code_plain ? "••••••••" : "E.g. MENTOR2024"
                                  }
                                  className="bg-muted border-border pr-10 uppercase tracking-wider font-mono h-10"
                                  maxLength={20}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowAccessCode(!showAccessCode)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                  {showAccessCode ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                              </div>
                              <p className="text-[9px] text-muted-foreground mt-1">
                                {(step.access_code_hash || step.access_code_plain) && !step._access_code_raw
                                  ? "Code is set. Enter a new code to change it."
                                  : "Hashed securely. Save it somewhere safe."}
                              </p>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Message shown to viewer</Label>
                              <Textarea
                                value={
                                  step.access_code_message ||
                                  "To unlock this step, contact your mentor and request the access code for this session."
                                }
                                onChange={(e) =>
                                  onUpdate("access_code_message" as keyof FlowStep, e.target.value.slice(0, 200))
                                }
                                className="mt-1 bg-muted border-border"
                                rows={2}
                                maxLength={200}
                              />
                              <p className="text-[9px] text-muted-foreground text-right mt-0.5">
                                {(
                                  step.access_code_message ||
                                  "To unlock this step, contact your mentor and request the access code for this session."
                                ).length}
                                /200
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* SECTION — Per-step Speaker (only when scope is per_step) */}
            {speakerScope === "per_step" && (
              <div className="py-4 border-t border-border space-y-3">
                <div className="flex items-center gap-2">
                  <User size={13} className="text-muted-foreground" />
                  <span className="text-[13px] font-medium text-foreground">Speaker</span>
                </div>
                <div className="flex rounded-xl border border-border overflow-hidden">
                  {(["none", "account", "custom"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => onUpdate("speaker_mode_step" as keyof FlowStep, mode)}
                      className={`flex-1 py-2 text-xs font-semibold transition-all ${
                        (step.speaker_mode_step || "none") === mode
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mode === "none" ? "None" : mode === "account" ? "Account" : "Custom"}
                    </button>
                  ))}
                </div>
                {(step.speaker_mode_step || "none") === "none" && (
                  <p className="text-[10px] text-muted-foreground">No speaker shown for this step.</p>
                )}
                {(step.speaker_mode_step || "none") === "account" && userProfile && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center overflow-hidden shrink-0">
                      {userProfile.avatar_url ? (
                        <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-primary font-bold text-xs">
                          {userProfile.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{userProfile.full_name || "Your Name"}</p>
                    </div>
                  </div>
                )}
                {(step.speaker_mode_step || "none") === "custom" && (
                  <div className="space-y-3">
                    <SpeakerPhotoUpload
                      value={step.speaker_photo_url_custom || ""}
                      onChange={(url) => onUpdate("speaker_photo_url_custom" as keyof FlowStep, url)}
                    />
                    <div>
                      <Label className="text-xs text-muted-foreground">Speaker Name</Label>
                      <Input
                        value={step.speaker_name_custom || ""}
                        onChange={(e) =>
                          onUpdate("speaker_name_custom" as keyof FlowStep, e.target.value.slice(0, 60))
                        }
                        placeholder="e.g. John Doe"
                        className="mt-1 bg-muted border-border h-10"
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Speaker Title</Label>
                      <Input
                        value={step.speaker_title || ""}
                        onChange={(e) =>
                          onUpdate("speaker_title" as keyof FlowStep, e.target.value.slice(0, 60))
                        }
                        placeholder="e.g. Founder & Coach"
                        className="mt-1 bg-muted border-border h-10"
                        maxLength={60}
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Bio</Label>
                      <Textarea
                        value={step.speaker_bio || ""}
                        onChange={(e) =>
                          onUpdate("speaker_bio" as keyof FlowStep, e.target.value.slice(0, 200))
                        }
                        placeholder="Short bio..."
                        className="mt-1 bg-muted border-border"
                        rows={2}
                        maxLength={200}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {speakerScope === "global" && stepIndex > 0 && (
              <div className="py-3 border-t border-border">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <User size={11} /> Speaker is set globally. Change in the Speaker tab.
                </p>
              </div>
            )}

            {/* SECTION — Per-step Video Topics */}
            {videoTopicsScope === "per_step" && (
              <div className="py-4 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks size={13} className="text-muted-foreground" />
                    <span className="text-[13px] font-medium text-foreground">Key Points</span>
                  </div>
                  <Switch
                    checked={step.video_topics_step_enabled ?? false}
                    onCheckedChange={(v) => onUpdate("video_topics_step_enabled" as keyof FlowStep, v)}
                  />
                </div>
                {step.video_topics_step_enabled && (
                  <div className="space-y-2">
                    {topics.map((topic, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={topic.text}
                          onChange={(e) => updateTopicText(idx, e.target.value)}
                          placeholder="Enter a topic..."
                          className="flex-1 bg-muted border-border text-sm h-9"
                          maxLength={100}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeTopic(idx)}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                    {topics.length < 10 && (
                      <Button variant="outline" size="sm" className="w-full" onClick={addTopic}>
                        <Plus size={12} /> Add Topic
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SECTION D — Between Steps */}
            {stepIndex < totalSteps - 1 && (
              <div className="border-t border-border">
                <Collapsible
                  open={betweenStepsOpen || step.between_step_audio_enabled || step.between_step_message_enabled}
                  onOpenChange={setBetweenStepsOpen}
                >
                  <CollapsibleTrigger asChild>
                    <div>
                      <SectionHeader
                        icon={Layers}
                        label="Between Steps"
                        isOpen={
                          betweenStepsOpen ||
                          !!(step.between_step_audio_enabled || step.between_step_message_enabled)
                        }
                        onToggle={() => setBetweenStepsOpen(!betweenStepsOpen)}
                      />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pb-4 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium flex items-center gap-1.5">
                            <Music size={11} className="text-muted-foreground" /> Audio Note
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
                            className="bg-muted border-border h-9"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium flex items-center gap-1.5">
                            <MessageSquare size={11} className="text-muted-foreground" /> Text Message
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
                            placeholder="Message shown while waiting..."
                            className="bg-muted border-border"
                            rows={2}
                          />
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* SECTION E — Step Active */}
            <div className="py-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Power size={13} className="text-muted-foreground" />
                  <div>
                    <span className="text-[13px] font-medium text-foreground">Step Active</span>
                    <p className="text-[10px] text-muted-foreground">Inactive steps are hidden from viewers</p>
                  </div>
                </div>
                <Switch checked={step.is_active} onCheckedChange={(v) => onUpdate("is_active", v)} />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
