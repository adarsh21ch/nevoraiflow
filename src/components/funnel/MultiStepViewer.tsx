import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Play, Lock, Check, CheckCircle2, Circle, ExternalLink,
  Calendar, CreditCard, ClipboardList, UserCheck, ChevronRight,
  Loader2, MessageCircle, Phone as PhoneIcon, BadgeCheck, Info, Sparkles
} from "lucide-react";

interface FunnelStep {
  id: string;
  step_order: number;
  title: string;
  description: string | null;
  step_type: string;
  video_asset_id: string | null;
  is_active: boolean;
  unlock_rule_type: string;
  unlock_rule_value: string | null;
  cta_text: string | null;
  cta_url: string | null;
  booking_url: string | null;
  video_url?: string | null;
  video_thumbnail?: string | null;
}

interface StepProgress {
  funnel_step_id: string;
  status: string;
  max_watched_seconds: number;
  watched_percentage: number;
  last_position_seconds: number;
  completed_at: string | null;
  manually_unlocked?: boolean;
}

interface MultiStepViewerProps {
  funnel: any;
  steps: FunnelStep[];
  creatorProfile: any;
  formConfig: any;
  priceOptions: any[];
  VideoPlayer: React.ComponentType<any>;
  isDark?: boolean;
}

const STEP_ICONS: Record<string, React.ComponentType<any>> = {
  video: Play,
  lead_form: ClipboardList,
  cta: ExternalLink,
  payment: CreditCard,
  manual_approval: UserCheck,
  booking: Calendar,
};

const STEP_TYPE_LABELS: Record<string, string> = {
  video: "Video",
  lead_form: "Lead Form",
  cta: "CTA / Link",
  payment: "Payment",
  manual_approval: "Manual Approval",
  booking: "Booking",
};

const UNLOCK_HINTS: Record<string, (value?: string | null) => string> = {
  auto: () => "This step is available now.",
  watch_complete: () => "Watch the previous video fully to unlock this step.",
  watch_seconds: (v) => `Watch at least ${v || "?"} seconds of the previous video to continue.`,
  watch_percent: (v) => `Watch at least ${v || "?"}% of the previous video to continue.`,
  cta_click: () => "Click the button in the previous step to unlock this one.",
  lead_submitted: () => "Submit your details in the previous step to continue.",
  payment_submitted: () => "Complete payment in the previous step to unlock this.",
  manual: () => "The creator will unlock this step for you after review.",
  booking_done: () => "Complete the booking in the previous step to continue.",
};

const getSessionId = (funnelId: string): string => {
  const key = `nf_session_${funnelId}`;
  let sid = localStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(key, sid);
  }
  return sid;
};

export const MultiStepViewer = ({
  funnel,
  steps,
  creatorProfile,
  formConfig,
  priceOptions,
  VideoPlayer,
  isDark = true,
}: MultiStepViewerProps) => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [progressMap, setProgressMap] = useState<Record<string, StepProgress>>({});
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", email: "", city: "", custom_value: "", website: "" });
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentProof, setPaymentProof] = useState({ upi_transaction_id: "", amount: 0 });
  const [loading, setLoading] = useState(true);
  const sessionId = useRef(getSessionId(funnel.id));
  const progressSaveTimer = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    const loadProgress = async () => {
      const { data } = await supabase
        .from("funnel_step_progress")
        .select("funnel_step_id, status, max_watched_seconds, watched_percentage, last_position_seconds, completed_at")
        .eq("funnel_id", funnel.id)
        .eq("session_id", sessionId.current);

      const map: Record<string, StepProgress> = {};
      if (data) {
        for (const p of data) {
          map[p.funnel_step_id] = p;
        }
      }

      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        if (!map[step.id]) {
          const status = i === 0 ? "unlocked" : "locked";
          map[step.id] = {
            funnel_step_id: step.id,
            status,
            max_watched_seconds: 0,
            watched_percentage: 0,
            last_position_seconds: 0,
            completed_at: null,
          };
          await supabase.from("funnel_step_progress").insert({
            funnel_id: funnel.id,
            funnel_step_id: step.id,
            session_id: sessionId.current,
            status,
          });
        }
      }

      setProgressMap(map);

      let furthest = 0;
      for (let i = 0; i < steps.length; i++) {
        const p = map[steps[i].id];
        if (p && (p.status === "unlocked" || p.status === "in_progress" || p.status === "completed")) {
          furthest = i;
        }
      }
      for (let i = 0; i <= furthest; i++) {
        const p = map[steps[i].id];
        if (p && p.status !== "completed") {
          setActiveStepIndex(i);
          break;
        }
        if (i === furthest) setActiveStepIndex(furthest);
      }

      setLoading(false);
    };
    if (steps.length > 0) loadProgress();
    else setLoading(false);
  }, [funnel.id, steps]);

  const getStepStatus = (stepId: string): string => {
    return progressMap[stepId]?.status || "locked";
  };

  const updateStepProgress = useCallback(async (stepId: string, updates: Partial<StepProgress>) => {
    setProgressMap((prev) => ({
      ...prev,
      [stepId]: { ...prev[stepId], ...updates },
    }));

    await supabase
      .from("funnel_step_progress")
      .update(updates as any)
      .eq("funnel_id", funnel.id)
      .eq("funnel_step_id", stepId)
      .eq("session_id", sessionId.current);
  }, [funnel.id]);

  const completeStep = useCallback(async (stepIndex: number) => {
    const step = steps[stepIndex];
    await updateStepProgress(step.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    if (stepIndex + 1 < steps.length) {
      const nextStep = steps[stepIndex + 1];
      const nextStatus = getStepStatus(nextStep.id);
      if (nextStatus === "locked") {
        const shouldUnlock = checkUnlockCondition(nextStep, stepIndex);
        if (shouldUnlock) {
          await updateStepProgress(nextStep.id, { status: "unlocked" });
        }
      }
    }
  }, [steps, progressMap, updateStepProgress]);

  const checkUnlockCondition = (step: FunnelStep, prevIndex: number): boolean => {
    const rule = step.unlock_rule_type;
    if (rule === "auto") return true;
    if (rule === "manual") return false;

    const prevStep = steps[prevIndex];
    const prevProgress = progressMap[prevStep.id];
    if (!prevProgress) return false;

    switch (rule) {
      case "watch_complete":
        return prevProgress.status === "completed";
      case "watch_seconds":
        return prevProgress.max_watched_seconds >= parseInt(step.unlock_rule_value || "0");
      case "watch_percent":
        return prevProgress.watched_percentage >= parseInt(step.unlock_rule_value || "0");
      case "cta_click":
      case "lead_submitted":
      case "payment_submitted":
      case "booking_done":
        return prevProgress.status === "completed";
      default:
        return true;
    }
  };

  const handleVideoTimeUpdate = useCallback((stepIndex: number, currentTime: number, duration: number) => {
    const step = steps[stepIndex];
    const progress = progressMap[step.id];
    if (!progress) return;

    const maxWatched = Math.max(progress.max_watched_seconds, Math.floor(currentTime));
    const pct = duration > 0 ? Math.floor((maxWatched / duration) * 100) : 0;

    setProgressMap((prev) => ({
      ...prev,
      [step.id]: {
        ...prev[step.id],
        status: prev[step.id]?.status === "unlocked" ? "in_progress" : prev[step.id]?.status || "in_progress",
        max_watched_seconds: maxWatched,
        watched_percentage: pct,
        last_position_seconds: Math.floor(currentTime),
      },
    }));

    if (pct >= 95 && progress.status !== "completed") {
      completeStep(stepIndex);
    }

    if (stepIndex + 1 < steps.length) {
      const nextStep = steps[stepIndex + 1];
      const nextStatus = getStepStatus(nextStep.id);
      if (nextStatus === "locked") {
        const rule = nextStep.unlock_rule_type;
        let shouldUnlock = false;
        if (rule === "watch_seconds" && maxWatched >= parseInt(nextStep.unlock_rule_value || "0")) shouldUnlock = true;
        if (rule === "watch_percent" && pct >= parseInt(nextStep.unlock_rule_value || "0")) shouldUnlock = true;
        if (shouldUnlock) {
          updateStepProgress(nextStep.id, { status: "unlocked" });
        }
      }
    }
  }, [steps, progressMap, completeStep, updateStepProgress]);

  useEffect(() => {
    progressSaveTimer.current = setInterval(() => {
      const activeStep = steps[activeStepIndex];
      if (!activeStep) return;
      const p = progressMap[activeStep.id];
      if (!p || p.status === "locked") return;
      supabase
        .from("funnel_step_progress")
        .update({
          max_watched_seconds: p.max_watched_seconds,
          watched_percentage: p.watched_percentage,
          last_position_seconds: p.last_position_seconds,
          status: p.status,
        })
        .eq("funnel_id", funnel.id)
        .eq("funnel_step_id", activeStep.id)
        .eq("session_id", sessionId.current)
        .then(() => {});
    }, 5000);
    return () => { if (progressSaveTimer.current) clearInterval(progressSaveTimer.current); };
  }, [activeStepIndex, progressMap, steps, funnel.id]);

  const handleCtaClick = async (stepIndex: number) => {
    const step = steps[stepIndex];
    if (step.cta_url) window.open(step.cta_url, "_blank");
    if (step.booking_url) window.open(step.booking_url, "_blank");
    await completeStep(stepIndex);
    toast.success("Step completed!");
  };

  const handleLeadSubmit = async (stepIndex: number) => {
    if (leadForm.website) return;
    await supabase.from("funnel_leads").insert({
      funnel_id: funnel.id,
      name: leadForm.name || null,
      phone: leadForm.phone || null,
      email: leadForm.email || null,
      city: leadForm.city || null,
      custom_value: leadForm.custom_value || null,
      device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
      user_agent: navigator.userAgent,
    });
    setLeadSubmitted(true);
    await completeStep(stepIndex);
    toast.success("Details submitted!");
  };

  const handlePaymentSubmit = async (stepIndex: number) => {
    await supabase.from("funnel_payments").insert({
      funnel_id: funnel.id,
      amount: paymentProof.amount || priceOptions[0]?.amount || 0,
      upi_transaction_id: paymentProof.upi_transaction_id || null,
      payment_type: "upi_manual",
    });
    setPaymentSubmitted(true);
    await completeStep(stepIndex);
    toast.success("Payment submitted!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="text-primary animate-spin" />
      </div>
    );
  }

  const activeStep = steps[activeStepIndex];
  const activeProgress = activeStep ? progressMap[activeStep.id] : null;
  const completedCount = steps.filter((s) => getStepStatus(s.id) === "completed").length;
  const progressPct = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const getUnlockHint = (step: FunnelStep, idx: number): string | null => {
    if (idx === 0) return null;
    const status = getStepStatus(step.id);
    if (status === "completed") return null;
    if (status === "locked") {
      const hintFn = UNLOCK_HINTS[step.unlock_rule_type];
      return hintFn ? hintFn(step.unlock_rule_value) : null;
    }
    return null;
  };

  // Check if next step just got unlocked
  const nextStepUnlocked = activeStep &&
    activeProgress?.status === "completed" &&
    activeStepIndex + 1 < steps.length &&
    getStepStatus(steps[activeStepIndex + 1].id) !== "locked";

  /* ─── Theme colors for sidebar ─── */
  const sc = {
    bg: isDark ? "#0f1117" : "#f8f9fa",
    border: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
    text: isDark ? "#f1f5f9" : "#0f172a",
    textMuted: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)",
    textDim: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)",
    textDimmer: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
    textLocked: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
    iconDim: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
    iconLocked: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
    progressBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    progressText: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)",
    itemBg: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
    itemIconBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
    cardBg: isDark ? "#141419" : "#ffffff",
    cardBorder: isDark ? "#27272a" : "#e5e7eb",
    inputBg: isDark ? "#09090b" : "#f1f5f9",
    stepBarBg: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
    stepBarBorder: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    stepBarActive: isDark ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)",
    stepBarInactive: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
  };

  /* ─── LEFT SIDEBAR (Desktop) ─── */
  const JourneySidebar = () => (
    <div
      className="hidden lg:flex flex-col w-[280px] min-w-[280px] shrink-0 h-[calc(100vh-52px)] sticky top-[52px] overflow-y-auto border-r"
      style={{
        background: sc.bg,
        borderColor: sc.border,
        padding: "24px 16px",
      }}
    >
      {/* Creator badge */}
      {creatorProfile?.full_name && (
        <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-[38px] h-[38px] rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: "2px solid rgba(34,197,94,0.3)" }}>
            {creatorProfile.avatar_url ? (
              <img src={creatorProfile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/15 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">{creatorProfile.full_name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[13px] text-white truncate" style={{ fontFamily: "'Plus Jakarta Sans', var(--font-heading), sans-serif" }}>
              {creatorProfile.full_name}
            </p>
            {creatorProfile.kyc_status === "approved" && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400">
                <BadgeCheck size={10} /> Verified
              </span>
            )}
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="pb-4 mb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          Journey Progress
        </p>
        <div className="h-1 rounded-full overflow-hidden mb-1.5" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, background: "linear-gradient(90deg, #22c55e, #16a34a)" }}
          />
        </div>
        <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
          {completedCount} / {steps.length} completed
        </p>
      </div>

      {/* Steps */}
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] mb-3 px-1" style={{ color: "rgba(255,255,255,0.3)" }}>
        Journey
      </p>
      <div className="space-y-1 flex-1">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = STEP_ICONS[step.step_type] || Circle;
          const isActive = idx === activeStepIndex;
          const isLocked = status === "locked";
          const isCompleted = status === "completed";
          const isInProgress = status === "in_progress";

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && setActiveStepIndex(idx)}
              disabled={isLocked}
              className="w-full flex items-start gap-3 text-left transition-all"
              style={{
                padding: "12px 14px",
                borderRadius: "12px",
                border: isCompleted
                  ? "1px solid rgba(34,197,94,0.25)"
                  : isActive
                  ? "1px solid rgba(34,197,94,0.3)"
                  : "1px solid transparent",
                borderLeft: isCompleted ? "3px solid #22c55e" : isActive ? "3px solid #22c55e" : "3px solid transparent",
                background: isCompleted
                  ? "rgba(34,197,94,0.1)"
                  : isActive
                  ? "rgba(34,197,94,0.08)"
                  : isLocked
                  ? "transparent"
                  : "rgba(255,255,255,0.03)",
                cursor: isLocked ? "not-allowed" : "pointer",
                opacity: isLocked ? 0.4 : 1,
                marginBottom: "4px",
              }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{
                  background: isCompleted ? "rgba(34,197,94,0.2)" : isActive ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.06)",
                }}
              >
                {isCompleted ? (
                  <Check size={13} className="text-green-400" />
                ) : isLocked ? (
                  <Lock size={11} style={{ color: "rgba(255,255,255,0.25)" }} />
                ) : (
                  <Icon size={13} className={isActive ? "text-green-400" : ""} style={!isActive ? { color: "rgba(255,255,255,0.5)" } : {}} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="font-semibold leading-tight truncate"
                  style={{
                    fontSize: "13px",
                    color: isLocked ? "rgba(255,255,255,0.25)" : "#f1f5f9",
                    fontFamily: "'Plus Jakarta Sans', var(--font-heading), sans-serif",
                  }}
                >
                  {step.title || `Step ${idx + 1}`}
                </p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "2px" }}>
                  {STEP_TYPE_LABELS[step.step_type] || step.step_type}
                  {" · "}
                  {isCompleted ? "Completed" : isInProgress ? "In Progress" : isActive ? "Available" : isLocked ? "Locked" : "Available"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Contact buttons */}
      {funnel.show_contact_buttons && (
        <div className="mt-4 pt-3 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {funnel.contact_whatsapp && (
            <button
              onClick={() => window.open(`https://wa.me/${funnel.contact_whatsapp?.replace(/\D/g, "")}`)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: "rgba(37,211,102,0.1)", color: "#25d366" }}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
          )}
          {funnel.contact_phone && (
            <button
              onClick={() => window.open(`tel:${funnel.contact_phone}`)}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)" }}
            >
              <PhoneIcon size={14} /> Call
            </button>
          )}
        </div>
      )}
    </div>
  );

  /* ─── MOBILE STEP BAR ─── */
  const MobileStepBar = () => (
    <div
      className="lg:hidden flex gap-2 overflow-x-auto py-3 px-4"
      style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
        background: "rgba(255,255,255,0.02)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {steps.map((step, idx) => {
        const status = getStepStatus(step.id);
        const isActive = idx === activeStepIndex;
        const isLocked = status === "locked";
        const isCompleted = status === "completed";

        return (
          <button
            key={step.id}
            onClick={() => !isLocked && setActiveStepIndex(idx)}
            disabled={isLocked}
            className="flex items-center gap-1.5 shrink-0 transition-all"
            style={{
              padding: "6px 14px",
              borderRadius: "100px",
              fontSize: "12px",
              fontWeight: 600,
              whiteSpace: "nowrap",
              border: isActive
                ? "1px solid rgba(34,197,94,0.4)"
                : isCompleted
                ? "1px solid rgba(34,197,94,0.25)"
                : "1px solid rgba(255,255,255,0.08)",
              background: isActive
                ? "rgba(34,197,94,0.15)"
                : isCompleted
                ? "rgba(34,197,94,0.08)"
                : "rgba(255,255,255,0.03)",
              color: isActive
                ? "#22c55e"
                : isCompleted
                ? "#4ade80"
                : isLocked
                ? "rgba(255,255,255,0.25)"
                : "rgba(255,255,255,0.6)",
              cursor: isLocked ? "not-allowed" : "pointer",
              opacity: isLocked ? 0.5 : 1,
            }}
          >
            {isCompleted ? <Check size={12} /> : isLocked ? <Lock size={10} /> : <Circle size={10} />}
            {step.title || `Step ${idx + 1}`}
          </button>
        );
      })}
      <style>{`.lg\\:hidden::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-52px)]">
      {/* LEFT sidebar — desktop */}
      <JourneySidebar />

      {/* Mobile step bar */}
      <div className="flex flex-col flex-1 min-w-0">
        <MobileStepBar />

        {/* Main content */}
        <div className="flex-1 px-4 lg:px-8 py-6 lg:py-8 max-w-[860px] mx-auto w-full">
          {/* Step header */}
          {activeStep && (
            <div className="space-y-5">
              <div style={{ paddingBottom: "12px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "16px" }}>
                <div className="flex items-center gap-3 mb-1">
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.4)",
                    }}
                  >
                    Step {activeStepIndex + 1} of {steps.length}
                  </span>
                  {activeProgress?.status === "completed" && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-green-400">
                      <Check size={10} /> Completed
                    </span>
                  )}
                  {activeProgress?.status === "in_progress" && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(251,146,60,0.15)", color: "#fb923c" }}>
                      In Progress
                    </span>
                  )}
                </div>
                <h2
                  className="font-heading font-bold text-white"
                  style={{ fontSize: "20px", fontFamily: "'Plus Jakarta Sans', var(--font-heading), sans-serif" }}
                >
                  {activeStep.title || `Step ${activeStepIndex + 1}`}
                </h2>
                {activeStep.description && (
                  <p className="mt-1" style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)" }}>{activeStep.description}</p>
                )}
              </div>

              {/* Unlock hint for locked steps */}
              {getStepStatus(activeStep.id) === "locked" && (
                <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.2)" }}>
                  <Lock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">Step Locked</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(251,191,36,0.7)" }}>{getUnlockHint(activeStep, activeStepIndex)}</p>
                  </div>
                </div>
              )}

              {/* Inline hint about what unlocks next */}
              {activeStepIndex + 1 < steps.length && getStepStatus(activeStep.id) !== "completed" && getStepStatus(steps[activeStepIndex + 1].id) === "locked" && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <Info size={13} className="shrink-0 mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", lineHeight: "1.5" }}>
                    <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Next:</span> {getUnlockHint(steps[activeStepIndex + 1], activeStepIndex + 1)}
                  </p>
                </div>
              )}

              {/* Step type content */}
              {activeStep.step_type === "video" && activeStep.video_url && (
                <div className="space-y-3">
                  <VideoPlayer
                    src={activeStep.video_url}
                    poster={activeStep.video_thumbnail || undefined}
                    allowSeek={funnel.allow_seek !== false}
                    allowSpeed={funnel.allow_speed_change !== false}
                    autoplay={true}
                    initialTime={activeProgress?.last_position_seconds || 0}
                    onTimeUpdate={(ct: number, dur: number) => handleVideoTimeUpdate(activeStepIndex, ct, dur)}
                  />
                </div>
              )}

              {activeStep.step_type === "video" && !activeStep.video_url && (
                <div className="aspect-video rounded-2xl flex items-center justify-center" style={{ background: "#141419", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="text-center">
                    <Play size={40} style={{ color: "rgba(255,255,255,0.2)" }} className="mx-auto mb-2" />
                    <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)" }}>Video not available</p>
                  </div>
                </div>
              )}

              {activeStep.step_type === "lead_form" && (
                <div className="rounded-2xl p-6" style={{ background: "#141419", border: "1px solid #27272a" }}>
                  {leadSubmitted || activeProgress?.status === "completed" ? (
                    <div className="text-center py-6">
                      <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                      <h3 className="font-heading font-bold text-white">Details Submitted</h3>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }} className="mt-1">Thank you for your information.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-heading font-bold mb-4 text-white">Fill in your details</h3>
                      <form onSubmit={(e) => { e.preventDefault(); handleLeadSubmit(activeStepIndex); }} className="space-y-3">
                        <input type="text" name="website" value={leadForm.website} onChange={(e) => setLeadForm({ ...leadForm, website: e.target.value })} style={{ position: "absolute", left: "-9999px" }} tabIndex={-1} autoComplete="off" />
                        {formConfig?.show_name && <Input placeholder="Full Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required={formConfig.name_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                        {formConfig?.show_phone && (
                          <div className="flex gap-2">
                            <div className="flex items-center px-3 bg-[#09090b] border border-[#27272a] rounded-xl text-sm text-white/40 shrink-0 h-12">+91</div>
                            <Input placeholder="Phone number" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} required={formConfig.phone_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />
                          </div>
                        )}
                        {formConfig?.show_email && <Input type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} required={formConfig.email_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                        {formConfig?.show_city && <Input placeholder="City" value={leadForm.city} onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })} required={formConfig.city_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                        <Button type="submit" className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">Submit →</Button>
                      </form>
                    </>
                  )}
                </div>
              )}

              {(activeStep.step_type === "cta" || activeStep.step_type === "booking") && (
                <div className="rounded-2xl p-6 text-center" style={{ background: "#141419", border: "1px solid #27272a" }}>
                  {activeProgress?.status === "completed" ? (
                    <>
                      <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                      <h3 className="font-heading font-bold text-white">Step Completed</h3>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-heading font-bold text-white mb-2">{activeStep.cta_text || (activeStep.step_type === "booking" ? "Book Your Call" : "Continue")}</h3>
                      {activeStep.description && <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }} className="mb-4">{activeStep.description}</p>}
                      <Button
                        className="h-14 px-8 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/20"
                        onClick={() => handleCtaClick(activeStepIndex)}
                      >
                        {activeStep.cta_text || (activeStep.step_type === "booking" ? "Book Now" : "Continue")} →
                      </Button>
                    </>
                  )}
                </div>
              )}

              {activeStep.step_type === "payment" && (
                <div className="rounded-2xl p-6" style={{ background: "#141419", border: "1px solid #27272a" }}>
                  {paymentSubmitted || activeProgress?.status === "completed" ? (
                    <div className="text-center py-6">
                      <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                      <h3 className="font-heading font-bold text-white">Payment Submitted</h3>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }} className="mt-1">Your payment is being reviewed.</p>
                    </div>
                  ) : (
                    <>
                      <h3 className="text-lg font-heading font-semibold mb-4 text-white">Complete Payment</h3>
                      {priceOptions.length > 0 && (
                        <div className="space-y-2 mb-4">
                          {priceOptions.map((opt: any) => (
                            <button key={opt.id} onClick={() => setPaymentProof({ ...paymentProof, amount: opt.amount })}
                              className={`w-full p-3 rounded-xl border text-left transition-all ${paymentProof.amount === opt.amount ? "border-primary bg-primary/10" : "border-[#27272a] bg-[#09090b]"}`}>
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-white">{opt.label}</span>
                                <span className="font-heading font-bold text-white">₹{opt.amount.toLocaleString("en-IN")}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {funnel.upi_id && (
                        <div className="p-3 bg-[#09090b] rounded-xl mb-4">
                          <span className="text-xs" style={{ color: "#94a3b8" }}>Pay via UPI</span>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm text-primary flex-1">{funnel.upi_id}</code>
                            <Button variant="ghost" size="sm" style={{ color: "#94a3b8" }} onClick={() => { navigator.clipboard.writeText(funnel.upi_id!); toast.success("UPI ID copied!"); }}>Copy</Button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3">
                        <Input placeholder="UPI Transaction ID" value={paymentProof.upi_transaction_id} onChange={(e) => setPaymentProof({ ...paymentProof, upi_transaction_id: e.target.value })} className="bg-[#09090b] border-[#27272a] text-white h-12 rounded-xl" />
                        <Button className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => handlePaymentSubmit(activeStepIndex)}>
                          I've Made the Payment
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeStep.step_type === "manual_approval" && (
                <div className="rounded-2xl p-8 text-center" style={{ background: "#141419", border: "1px solid #27272a" }}>
                  {activeProgress?.status === "completed" || activeProgress?.manually_unlocked ? (
                    <>
                      <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                      <h3 className="font-heading font-bold text-white">Step Unlocked</h3>
                      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }} className="mt-1">You've been approved to continue.</p>
                    </>
                  ) : (
                    <>
                      <Lock size={40} style={{ color: "rgba(255,255,255,0.2)" }} className="mx-auto mb-3" />
                      <h3 className="font-heading font-bold text-white">Awaiting Approval</h3>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)" }} className="mt-2">{activeStep.description || "The creator will unlock this step for you after review."}</p>
                      {funnel.contact_whatsapp && (
                        <Button className="mt-4 bg-[#25d366] hover:bg-[#20b858] text-white" onClick={() => window.open(`https://wa.me/${funnel.contact_whatsapp?.replace(/\D/g, "")}`)}>
                          <MessageCircle size={16} /> Contact on WhatsApp
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Next Step Banner */}
              {nextStepUnlocked && (
                <button
                  onClick={() => setActiveStepIndex(activeStepIndex + 1)}
                  className="w-full flex items-center justify-between transition-all"
                  style={{
                    background: "rgba(34,197,94,0.1)",
                    border: "1px solid rgba(34,197,94,0.25)",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    cursor: "pointer",
                    marginTop: "16px",
                  }}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-green-400">
                    <Sparkles size={16} /> Next step unlocked!
                  </span>
                  <span className="flex items-center gap-1 text-sm font-medium text-green-400">
                    Continue to Step {activeStepIndex + 2} <ChevronRight size={16} />
                  </span>
                </button>
              )}

              {/* Completed step continue button (if next is available but not via banner) */}
              {activeProgress?.status === "completed" && !nextStepUnlocked && activeStepIndex + 1 < steps.length && getStepStatus(steps[activeStepIndex + 1].id) !== "locked" && (
                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold"
                  onClick={() => setActiveStepIndex(activeStepIndex + 1)}
                >
                  Next Step <ChevronRight size={16} />
                </Button>
              )}
            </div>
          )}

          {/* Mobile: Creator + Contact at bottom */}
          <div className="lg:hidden mt-6 space-y-3">
            {creatorProfile?.full_name && (
              <div className="flex items-center gap-3 py-3 px-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ border: "2px solid rgba(34,197,94,0.3)" }}>
                  {creatorProfile.avatar_url ? (
                    <img src={creatorProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/15 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{creatorProfile.full_name.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-white text-sm truncate">{creatorProfile.full_name}</span>
                    {creatorProfile.kyc_status === "approved" && <BadgeCheck size={15} className="text-primary flex-shrink-0" />}
                  </div>
                </div>
              </div>
            )}
            {funnel.show_contact_buttons && (funnel.contact_whatsapp || funnel.contact_phone) && (
              <div className="flex gap-2">
                {funnel.contact_whatsapp && (
                  <Button className="flex-1 bg-[#25d366] hover:bg-[#20b858] text-white h-11 rounded-xl text-sm" onClick={() => window.open(`https://wa.me/${funnel.contact_whatsapp?.replace(/\D/g, "")}`)}>
                    <MessageCircle size={16} /> WhatsApp
                  </Button>
                )}
                {funnel.contact_phone && (
                  <Button className="flex-1 bg-white/[0.06] hover:bg-white/10 text-white border border-white/[0.06] h-11 rounded-xl text-sm" onClick={() => window.open(`tel:${funnel.contact_phone}`)}>
                    <PhoneIcon size={16} /> Call
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
