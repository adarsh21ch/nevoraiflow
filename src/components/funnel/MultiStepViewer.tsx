import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Play, Lock, Check, CheckCircle2, Circle, ExternalLink,
  Calendar, CreditCard, ClipboardList, UserCheck, ChevronRight,
  Loader2
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
}

const STEP_ICONS: Record<string, React.ComponentType<any>> = {
  video: Play,
  lead_form: ClipboardList,
  cta: ExternalLink,
  payment: CreditCard,
  manual_approval: UserCheck,
  booking: Calendar,
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

  // Load existing progress
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

      // Initialize progress for steps that don't have records
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
          // Insert initial progress record
          await supabase.from("funnel_step_progress").insert({
            funnel_id: funnel.id,
            funnel_step_id: step.id,
            session_id: sessionId.current,
            status,
          });
        }
      }

      setProgressMap(map);

      // Find the furthest unlocked/in-progress step
      let furthest = 0;
      for (let i = 0; i < steps.length; i++) {
        const p = map[steps[i].id];
        if (p && (p.status === "unlocked" || p.status === "in_progress" || p.status === "completed")) {
          furthest = i;
        }
      }
      // Go to the first incomplete step, or furthest
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

    // Unlock next step if applicable
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

    // Update local state immediately for smooth UX
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

    // Check if video is complete (95%+)
    if (pct >= 95 && progress.status !== "completed") {
      completeStep(stepIndex);
    }

    // Check unlock conditions for next step
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

  // Persist progress every 5 seconds
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
    if (leadForm.website) return; // honeypot
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

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <div className="flex items-center gap-2 px-1">
        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${steps.length > 0 ? (completedCount / steps.length) * 100 : 0}%` }}
          />
        </div>
        <span className="text-[11px] text-white/40 font-medium tabular-nums">{completedCount}/{steps.length}</span>
      </div>

      {/* Step list */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {steps.map((step, idx) => {
          const status = getStepStatus(step.id);
          const Icon = STEP_ICONS[step.step_type] || Circle;
          const isActive = idx === activeStepIndex;
          const isLocked = status === "locked";
          const isCompleted = status === "completed";

          return (
            <button
              key={step.id}
              onClick={() => !isLocked && setActiveStepIndex(idx)}
              disabled={isLocked}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 border ${
                isActive
                  ? "bg-primary/15 border-primary/30 text-primary"
                  : isCompleted
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : isLocked
                  ? "bg-white/[0.02] border-white/[0.06] text-white/25 cursor-not-allowed"
                  : "bg-white/[0.04] border-white/[0.08] text-white/60 hover:bg-white/[0.06]"
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 size={14} className="text-green-400" />
              ) : isLocked ? (
                <Lock size={12} />
              ) : (
                <Icon size={14} />
              )}
              <span className="max-w-[120px] truncate">{step.title || `Step ${idx + 1}`}</span>
            </button>
          );
        })}
      </div>

      {/* Active step content */}
      {activeStep && (
        <div className="space-y-4">
          {/* Step header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-primary/60">Step {activeStepIndex + 1} of {steps.length}</span>
              {activeProgress?.status === "completed" && (
                <span className="text-[10px] font-medium text-green-400 flex items-center gap-1"><Check size={10} /> Completed</span>
              )}
            </div>
            <h2 className="text-xl font-heading font-bold text-white">{activeStep.title || `Step ${activeStepIndex + 1}`}</h2>
            {activeStep.description && <p className="text-sm text-white/40 mt-1">{activeStep.description}</p>}
          </div>

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
              {activeProgress?.status === "completed" && activeStepIndex + 1 < steps.length && (
                <Button
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold"
                  onClick={() => {
                    const nextIdx = activeStepIndex + 1;
                    if (getStepStatus(steps[nextIdx].id) !== "locked") {
                      setActiveStepIndex(nextIdx);
                    }
                  }}
                >
                  Next Step <ChevronRight size={16} />
                </Button>
              )}
            </div>
          )}

          {activeStep.step_type === "video" && !activeStep.video_url && (
            <div className="aspect-video bg-[#141419] rounded-2xl flex items-center justify-center border border-white/[0.04]">
              <div className="text-center">
                <Play size={40} className="text-white/20 mx-auto mb-2" />
                <p className="text-xs text-white/30">Video not available</p>
              </div>
            </div>
          )}

          {activeStep.step_type === "lead_form" && (
            <div className="bg-[#141419] border border-[#27272a] rounded-2xl p-6">
              {leadSubmitted || activeProgress?.status === "completed" ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-white">Details Submitted</h3>
                  <p className="text-xs text-white/40 mt-1">Thank you for your information.</p>
                  {activeStepIndex + 1 < steps.length && getStepStatus(steps[activeStepIndex + 1].id) !== "locked" && (
                    <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => setActiveStepIndex(activeStepIndex + 1)}>
                      Continue <ChevronRight size={14} />
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-heading font-bold mb-4 text-white">Fill in your details</h3>
                  <form onSubmit={(e) => { e.preventDefault(); handleLeadSubmit(activeStepIndex); }} className="space-y-3">
                    <input type="text" name="website" value={leadForm.website} onChange={(e) => setLeadForm({ ...leadForm, website: e.target.value })} style={{ position: "absolute", left: "-9999px" }} tabIndex={-1} autoComplete="off" />
                    {formConfig?.show_name && <Input placeholder="Full Name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} required={formConfig.name_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                    {formConfig?.show_phone && <Input placeholder="Phone (+91...)" value={leadForm.phone} onChange={(e) => setLeadForm({ ...leadForm, phone: e.target.value })} required={formConfig.phone_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                    {formConfig?.show_email && <Input type="email" placeholder="Email" value={leadForm.email} onChange={(e) => setLeadForm({ ...leadForm, email: e.target.value })} required={formConfig.email_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                    {formConfig?.show_city && <Input placeholder="City" value={leadForm.city} onChange={(e) => setLeadForm({ ...leadForm, city: e.target.value })} required={formConfig.city_required} className="bg-[#09090b] border-[#27272a] text-white placeholder:text-[#64748b] h-12 rounded-xl" />}
                    <Button type="submit" className="w-full h-14 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">Submit →</Button>
                  </form>
                </>
              )}
            </div>
          )}

          {(activeStep.step_type === "cta" || activeStep.step_type === "booking") && (
            <div className="bg-[#141419] border border-[#27272a] rounded-2xl p-6 text-center">
              {activeProgress?.status === "completed" ? (
                <>
                  <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-white">Step Completed</h3>
                  {activeStepIndex + 1 < steps.length && getStepStatus(steps[activeStepIndex + 1].id) !== "locked" && (
                    <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => setActiveStepIndex(activeStepIndex + 1)}>
                      Continue <ChevronRight size={14} />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-heading font-bold text-white mb-2">{activeStep.cta_text || (activeStep.step_type === "booking" ? "Book Your Call" : "Continue")}</h3>
                  {activeStep.description && <p className="text-sm text-white/40 mb-4">{activeStep.description}</p>}
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
            <div className="bg-[#141419] border border-[#27272a] rounded-2xl p-6">
              {paymentSubmitted || activeProgress?.status === "completed" ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-white">Payment Submitted</h3>
                  <p className="text-xs text-white/40 mt-1">Your payment is being reviewed.</p>
                  {activeStepIndex + 1 < steps.length && getStepStatus(steps[activeStepIndex + 1].id) !== "locked" && (
                    <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => setActiveStepIndex(activeStepIndex + 1)}>
                      Continue <ChevronRight size={14} />
                    </Button>
                  )}
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
                      <span className="text-xs text-[#94a3b8]">Pay via UPI</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-sm text-primary flex-1">{funnel.upi_id}</code>
                        <Button variant="ghost" size="sm" className="text-[#94a3b8]" onClick={() => { navigator.clipboard.writeText(funnel.upi_id!); toast.success("UPI ID copied!"); }}>Copy</Button>
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
            <div className="bg-[#141419] border border-[#27272a] rounded-2xl p-8 text-center">
              {activeProgress?.status === "completed" || activeProgress?.manually_unlocked ? (
                <>
                  <CheckCircle2 size={40} className="text-green-400 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-white">Step Unlocked</h3>
                  <p className="text-xs text-white/40 mt-1">You've been approved to continue.</p>
                  {activeStepIndex + 1 < steps.length && getStepStatus(steps[activeStepIndex + 1].id) !== "locked" && (
                    <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" onClick={() => setActiveStepIndex(activeStepIndex + 1)}>
                      Continue <ChevronRight size={14} />
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <Lock size={40} className="text-white/20 mx-auto mb-3" />
                  <h3 className="font-heading font-bold text-white">Awaiting Approval</h3>
                  <p className="text-sm text-white/40 mt-2">{activeStep.description || "The creator will unlock this step for you after review."}</p>
                  {funnel.contact_whatsapp && (
                    <Button className="mt-4 bg-[#25d366] hover:bg-[#20b858] text-white" onClick={() => window.open(`https://wa.me/${funnel.contact_whatsapp?.replace(/\D/g, "")}`)}>
                      Contact on WhatsApp
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
