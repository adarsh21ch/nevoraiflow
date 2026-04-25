import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { Eye, EyeOff, Mail, Lock, User, Phone, Sparkles, ArrowLeft, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Stage = "email" | "login" | "signup" | "nevorai-otp" | "set-password";

interface NevoraiInfo {
  fullName?: string | null;
  isPro: boolean;
  hasNflowAccount?: boolean;
}

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();

  const [stage, setStage] = useState<Stage>("email");
  useDocumentTitle(stage === "signup" ? "Get Started" : "Sign In");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: searchParams.get("email") || "",
    phone: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [nevoraiInfo, setNevoraiInfo] = useState<NevoraiInfo | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [otpSendStatus, setOtpSendStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [otpShake, setOtpShake] = useState(false);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const lastAutoSubmittedRef = useRef<string>("");
  const verifyOtpCodeRef = useRef<((code: string) => Promise<void>) | null>(null);

  // Auto-detect state
  const [autoCheckStatus, setAutoCheckStatus] = useState<"idle" | "checking" | "match" | "none">("idle");
  const [autoCheckInfo, setAutoCheckInfo] = useState<NevoraiInfo | null>(null);
  const lookupCacheRef = useRef<Map<string, { exists: boolean; isPro: boolean; fullName: string | null; hasNflowAccount: boolean }>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkStartRef = useRef<number>(0);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  // Debounced auto-lookup as the user types (only on email stage)
  useEffect(() => {
    if (stage !== "email") return;
    const email = form.email.trim().toLowerCase();

    // Reset visual state when email changes
    if (!isValidEmail(email)) {
      setAutoCheckStatus("idle");
      setAutoCheckInfo(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      return;
    }

    // Cache hit — instant
    const cached = lookupCacheRef.current.get(email);
    if (cached) {
      if (cached.exists) {
        setAutoCheckStatus("match");
        setAutoCheckInfo({ fullName: cached.fullName, isPro: cached.isPro, hasNflowAccount: cached.hasNflowAccount });
      } else {
        setAutoCheckStatus("none");
        setAutoCheckInfo(null);
      }
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setAutoCheckStatus("checking");
      checkStartRef.current = Date.now();

      try {
        const { data, error } = await supabase.functions.invoke("verify-nevorai-member", {
          body: { email, mode: "lookup" },
        });
        if (controller.signal.aborted) return;
        if (error) throw error;

        const result = {
          exists: !!data?.exists,
          isPro: !!data?.isPro,
          fullName: data?.fullName ?? null,
          hasNflowAccount: !!data?.hasNflowAccount,
        };
        lookupCacheRef.current.set(email, result);

        // Min display time for "checking" to avoid flicker
        const elapsed = Date.now() - checkStartRef.current;
        const wait = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          if (controller.signal.aborted) return;
          if (result.exists) {
            setAutoCheckStatus("match");
            setAutoCheckInfo({ fullName: result.fullName, isPro: result.isPro, hasNflowAccount: result.hasNflowAccount });
          } else {
            setAutoCheckStatus("none");
            setAutoCheckInfo(null);
          }
        }, wait);
      } catch (e) {
        if (!controller.signal.aborted) {
          // Fail silently — manual Continue still works
          setAutoCheckStatus("idle");
          setAutoCheckInfo(null);
        }
      }
    }, 700);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.email, stage]);

  // Resend countdown ticker
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Reset resend tracking when leaving OTP stage
  useEffect(() => {
    if (stage !== "nevorai-otp") {
      setResendCount(0);
      setResendCooldown(0);
      setOtpSendStatus("idle");
      lastAutoSubmittedRef.current = "";
    }
  }, [stage]);

  // Move user into the OTP stage when they confirm a detected match
  const enterOtpFromAutoDetect = () => {
    if (!autoCheckInfo) return;
    setNevoraiInfo(autoCheckInfo);
    // If the user already has an nFlow account, skip OTP and go to password login
    if (autoCheckInfo.hasNflowAccount) {
      setStage("login");
      return;
    }
    setStage("nevorai-otp");
    // Auto-send the OTP so they don't need an extra click
    handleSendOtp();
  };

  // Auto-submit when 6 digits are entered (uses ref to prevent dup invocation)
  useEffect(() => {
    if (stage !== "nevorai-otp") return;
    if (otp.length === 6 && !submitting && lastAutoSubmittedRef.current !== otp) {
      lastAutoSubmittedRef.current = otp;
      verifyOtpCodeRef.current?.(otp);
    }
  }, [otp, stage, submitting]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const resetToEmail = () => {
    setStage("email");
    setNevoraiInfo(null);
    setOtp("");
    setForm((f) => ({ ...f, password: "", name: "", phone: "" }));
    setAutoCheckStatus("idle");
    setAutoCheckInfo(null);
  };

  // Step 1: Email continue — branch into login / signup / nevorai-otp
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (!email) {
      toast.error("Please enter your email");
      return;
    }
    // Use cached auto-detect result if we already know
    const cached = lookupCacheRef.current.get(email);
    if (cached) {
      if (cached.exists) {
        setNevoraiInfo({ fullName: cached.fullName, isPro: cached.isPro, hasNflowAccount: cached.hasNflowAccount });
        if (cached.hasNflowAccount) {
          setStage("login");
          return;
        }
        setStage("nevorai-otp");
        handleSendOtp();
        return;
      }
      setStage("signup");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-nevorai-member", {
        body: { email, mode: "lookup" },
      });
      if (error) throw error;

      if (data?.exists) {
        setNevoraiInfo({ fullName: data.fullName, isPro: !!data.isPro, hasNflowAccount: !!data.hasNflowAccount });
        if (data.hasNflowAccount) {
          setStage("login");
          return;
        }
        setStage("nevorai-otp");
        return;
      }
      setStage("signup");
    } catch (e: any) {
      console.error("Lookup failed", e);
      setStage("signup");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2a: Send OTP for Nevorai users (instant, no queue)
  const handleSendOtp = async () => {
    if (resendCount >= 3) {
      toast.error("Too many attempts. Please wait 10 minutes.");
      return;
    }
    setSubmitting(true);
    setOtpSendStatus("sending");
    try {
      const { data, error } = await supabase.functions.invoke("verify-nevorai-member", {
        body: { email: form.email.trim().toLowerCase(), mode: "send_otp" },
      });
      if (error) throw error;
      if (data?.otpSent) {
        setOtpSendStatus("sent");
        setResendCooldown(30);
        setResendCount((c) => c + 1);
        setOtp("");
        lastAutoSubmittedRef.current = "";
        toast.success(`Code sent to ${form.email}. Check your inbox.`);
        // Auto-focus the OTP input
        setTimeout(() => otpInputRef.current?.focus(), 100);
      } else {
        setOtpSendStatus("failed");
        toast.error(data?.error || "Couldn't send code. Please try again.");
      }
    } catch (e: any) {
      setOtpSendStatus("failed");
      toast.error(e?.message || "Couldn't send code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };



  // Step 2b: Verify OTP and sign in / create account
  const verifyOtpCode = async (code: string) => {
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-nevorai-otp", {
        body: { email: form.email.trim().toLowerCase(), code },
      });
      if (error) throw error;
      if (!data?.success) {
        setOtpShake(true);
        setTimeout(() => setOtpShake(false), 500);
        setOtp("");
        lastAutoSubmittedRef.current = "";
        otpInputRef.current?.focus();
        toast.error(data?.error || "Incorrect code. Try again.");
        return;
      }
      if (data.session?.access_token && data.session?.refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
        if (setErr) {
          toast.error("Verified but could not sign you in. Please try logging in.");
          setStage("login");
          return;
        }
        toast.success(
          data.isPro
            ? "Welcome! Individual plan unlocked."
            : "Welcome to the Nevorai family!",
        );
        // Offer one-time password setup so they can log in with email+password later.
        // Skippable — OTP login still works as a fallback.
        setForm((f) => ({ ...f, password: "" }));
        setStage("set-password");
      } else {
        toast.error("Verified, but session could not be created. Try signing in.");
        setStage("login");
      }
    } catch (e: any) {
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 500);
      toast.error(e?.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyOtpCode(otp);
  };

  // Keep ref in sync so the auto-submit effect (declared above early return) can call it
  verifyOtpCodeRef.current = verifyOtpCode;

  // Step 2c: Brand-new signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Please enter your name"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSubmitting(true);
    try {
      const { error } = await signUp(form.email, form.password, form.name, form.phone);
      if (error) {
        // Surface common, actionable errors verbatim (e.g. HIBP "leaked password")
        toast.error(error.message);
        return;
      }
      toast.success("Account created! Please check your email to verify.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2d: Existing nFlow user login — server-tracked lockout (5 fails / 30 min)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // 1. Check server-side lockout first
      const { data: lockData } = await supabase.rpc("check_auth_lockout", {
        _email: form.email,
        _ip: null,
      });
      const lock = lockData as { locked?: boolean; unlock_at?: string } | null;
      if (lock?.locked) {
        const unlockAt = lock.unlock_at ? new Date(lock.unlock_at) : null;
        const mins = unlockAt ? Math.max(1, Math.ceil((unlockAt.getTime() - Date.now()) / 60000)) : 30;
        toast.error(`Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`);
        return;
      }

      // 2. Try sign-in
      const { error } = await signIn(form.email, form.password);

      // 3. Record outcome on server
      await supabase.rpc("record_auth_attempt", {
        _email: form.email,
        _ip: null,
        _success: !error,
      });

      if (error) {
        // Generic message — don't reveal whether email exists
        toast.error("Invalid email or password.");
        return;
      }
      toast.success("Welcome back!");
      navigate("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 3 (Nevorai OTP only): optionally set a password so the user can log in
  // with email + password next time. Skippable — OTP login still works.
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: form.password });
      if (error) {
        toast.error(error.message || "Could not set password. You can do this later from Settings.");
        return;
      }
      toast.success("Password set. You can now log in with email + password.");
      navigate("/dashboard");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipPassword = () => {
    navigate("/dashboard");
  };


  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg-subtle relative">
      <div className="absolute inset-0 animate-grid opacity-30" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at 50% 0%, rgba(26, 79, 214, 0.12) 0%, transparent 70%)",
        }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block"><Logo size="lg" showByline /></Link>
          <p className="text-sm mt-3" style={{ color: "#8899AA" }}>
            {stage === "email" && "Welcome — let's get you in."}
            {stage === "login" && "Welcome back! Enter your password."}
            {stage === "signup" && "Create your nFlow account."}
            {stage === "nevorai-otp" && (nevoraiInfo?.isPro
              ? "You're a Nevorai Pro member — verify to unlock free."
              : "You're part of the Nevorai family.")}
            {stage === "set-password" && "One last thing — set a password for next time."}
          </p>
        </div>

        <div className="auth-card p-8">
          {/* Back button on every stage past email — hidden during set-password (user is already signed in) */}
          {stage !== "email" && stage !== "set-password" && (
            <button
              type="button"
              onClick={resetToEmail}
              className="flex items-center gap-1 text-xs mb-4 hover:text-foreground transition-colors"
              style={{ color: "#8899AA" }}
            >
              <ArrowLeft size={14} /> Use a different email
            </button>
          )}

          {/* STAGE: EMAIL */}
          {stage === "email" && (
            <form onSubmit={handleContinue} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                  <Input
                    id="email" type="email" placeholder="you@example.com"
                    className="auth-input pl-9" required autoFocus
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>

                {/* Auto-detect status */}
                {autoCheckStatus === "checking" && (
                  <div className="flex items-center gap-2 text-xs px-1" style={{ color: "#8899AA" }}>
                    <Loader2 size={12} className="animate-spin" /> Checking your email…
                  </div>
                )}
                {autoCheckStatus === "match" && autoCheckInfo && (
                  <div className="flex items-start gap-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
                    <CheckCircle2 size={16} className="text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {autoCheckInfo.fullName
                          ? `Welcome back, ${autoCheckInfo.fullName.split(" ")[0]}!`
                          : "Welcome back!"}{" "}
                        <span className="text-primary">
                          {autoCheckInfo.hasNflowAccount
                            ? "You already have an nFlow account."
                            : "You're part of the Nevorai family."}
                        </span>
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#8899AA" }}>
                        {autoCheckInfo.hasNflowAccount
                          ? "Enter your password to log in."
                          : autoCheckInfo.isPro
                            ? "Verify your email to unlock the Individual plan — free."
                            : "We'll send a code to securely sign you in."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {autoCheckStatus === "match" ? (
                <Button
                  type="button"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                  onClick={enterOtpFromAutoDetect}
                  style={{ borderRadius: "12px" }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      {autoCheckInfo?.hasNflowAccount ? "Loading…" : "Sending code…"}
                    </span>
                  ) : autoCheckInfo?.hasNflowAccount ? (
                    <span className="flex items-center gap-2">
                      <Lock size={16} /> Continue to log in
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldCheck size={16} /> Send verification code
                    </span>
                  )}
                </Button>
              ) : (
                <Button variant="hero" className="w-full" size="lg" disabled={submitting || autoCheckStatus === "checking"} style={{ borderRadius: "12px" }}>
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Checking…
                    </span>
                  ) : "Continue"}
                </Button>
              )}

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStage("login")}
                  className="text-xs hover:underline"
                  style={{ color: "#8899AA" }}
                >
                  Already have an nFlow account? <span className="text-primary">Log in</span>
                </button>
              </div>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
              </div>
              <OAuthButtons
                oauthLoading={oauthLoading}
                setOauthLoading={setOauthLoading}
                disabled={submitting}
                navigate={navigate}
              />
            </form>
          )}

          {/* STAGE: NEVORAI OTP */}
          {stage === "nevorai-otp" && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${nevoraiInfo?.isPro ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"}`}>
                <div className="flex items-start gap-3">
                  <Sparkles className={nevoraiInfo?.isPro ? "text-primary" : "text-muted-foreground"} size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {nevoraiInfo?.fullName ? `Hi ${nevoraiInfo.fullName.split(" ")[0]} —` : "Welcome —"} we found your Nevorai account
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#8899AA" }}>
                      {nevoraiInfo?.isPro
                        ? "You have a Nevorai Pro subscription. Verify your email to unlock the Individual plan on nFlow — free, no payment needed."
                        : "You're already part of the Nevorai family. We'll send you a 6-digit code to securely sign you in to nFlow."}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-sm">Verification code</Label>
                  <Input
                    id="otp"
                    ref={otpInputRef}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="••••••"
                    autoFocus
                    className={`auth-input text-center tracking-[0.5em] text-lg ${otpShake ? "animate-shake border-destructive" : ""}`}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={submitting}
                  />
                  <p className="text-xs" style={{ color: "#8899AA" }}>
                    {otpSendStatus === "sending" ? (
                      <span className="flex items-center gap-1.5"><Loader2 size={11} className="animate-spin" /> Sending your code…</span>
                    ) : (
                      <>Sent to <span className="text-foreground">{form.email}</span>. Check your inbox or spam folder. Expires in 10 min.</>
                    )}
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={submitting || otp.length !== 6}
                  style={{ borderRadius: "12px" }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Verifying…</span>
                  ) : (
                    <span className="flex items-center gap-2"><ShieldCheck size={16} /> Verify & continue</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={submitting || resendCooldown > 0 || resendCount >= 3}
                  onClick={handleSendOtp}
                >
                  {resendCount >= 3
                    ? "Too many attempts — wait 10 min"
                    : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                </Button>
              </form>
            </div>
          )}

          {/* STAGE: SIGNUP (brand new) */}
          {stage === "signup" && (
            !form.email.trim() ? (
              // Safety net: never show signup without an email — bounce back
              <div className="space-y-4 text-center py-6">
                <p className="text-sm" style={{ color: "#8899AA" }}>
                  Please enter your email first so we can set up your account.
                </p>
                <Button variant="hero" size="lg" className="w-full" onClick={resetToEmail} style={{ borderRadius: "12px" }}>
                  Enter your email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm">Full Name <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                    <Input id="name" placeholder="Your full name" className="auth-input pl-9" required
                      value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                    <Input className="auth-input pl-9 pr-16 opacity-90" value={form.email} readOnly />
                    <button
                      type="button"
                      onClick={resetToEmail}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm">Phone <span style={{ color: "#8899AA" }} className="text-xs">(optional)</span></Label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                    <Input id="phone" placeholder="+91 9876543210" className="auth-input pl-9"
                      value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <PasswordField form={form} setForm={setForm} showPassword={showPassword} setShowPassword={setShowPassword} />
                <Button variant="hero" className="w-full" size="lg" disabled={submitting} style={{ borderRadius: "12px" }}>
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Creating account…</span>
                  ) : "Create Account"}
                </Button>
                <div className="text-center">
                  <button type="button" onClick={() => setStage("login")} className="text-xs hover:underline" style={{ color: "#8899AA" }}>
                    Already have an account? <span className="text-primary">Log in</span>
                  </button>
                </div>
              </form>
            )
          )}

          {/* STAGE: LOGIN (existing nFlow user) */}
          {stage === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                  <Input className="auth-input pl-9" value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
              </div>
              <PasswordField
                form={form} setForm={setForm}
                showPassword={showPassword} setShowPassword={setShowPassword}
                showForgot
              />
              <Button variant="hero" className="w-full" size="lg" disabled={submitting} style={{ borderRadius: "12px" }}>
                {submitting ? (
                  <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Signing in…</span>
                ) : "Sign In"}
              </Button>
              <div className="text-center">
                <button type="button" onClick={resetToEmail} className="text-xs hover:underline" style={{ color: "#8899AA" }}>
                  No account yet? <span className="text-primary">Create one</span>
                </button>
              </div>
            </form>
          )}

          {/* STAGE: SET PASSWORD (post-OTP, optional) */}
          {stage === "set-password" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="text-primary shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-semibold">You're signed in 🎉</p>
                    <p className="text-xs mt-1" style={{ color: "#8899AA" }}>
                      Set a password so you can log in with your email next time — no code needed.
                      You can always skip this and request a code later.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                    <Input className="auth-input pl-9 opacity-90" value={form.email} readOnly />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm">
                    Create a password <span style={{ color: "#8899AA" }} className="text-xs">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      className="auth-input pl-9 pr-10"
                      autoFocus
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground"
                      style={{ color: "#8899AA" }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-xs" style={{ color: "#8899AA" }}>
                    Minimum 8 characters. You can change it anytime from Settings.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  size="lg"
                  disabled={submitting || form.password.length < 8}
                  style={{ borderRadius: "12px" }}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Saving…</span>
                  ) : (
                    <span className="flex items-center gap-2"><ShieldCheck size={16} /> Set password & continue</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                  onClick={handleSkipPassword}
                >
                  Skip for now
                </Button>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "#8899AA" }}>
          By continuing, you agree to our <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

const PasswordField = ({ form, setForm, showPassword, setShowPassword, showForgot }: any) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between">
      <Label htmlFor="password" className="text-sm">Password <span className="text-destructive">*</span></Label>
      {showForgot && <Link to="/auth/reset-password" className="text-xs text-primary hover:underline">Forgot password?</Link>}
    </div>
    <div className="relative">
      <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#8899AA" }} />
      <Input
        id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
        className="auth-input pl-9 pr-10" required
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />
      <button type="button" onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3 top-1/2 -translate-y-1/2 hover:text-foreground" style={{ color: "#8899AA" }}>
        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  </div>
);

const OAuthButtons = ({ oauthLoading, setOauthLoading, disabled, navigate }: any) => (
  <>
    <Button type="button" variant="outline" className="w-full" size="lg" disabled={disabled || !!oauthLoading}
      onClick={async () => {
        setOauthLoading("google");
        try {
          const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
          if (result.error) { toast.error("Google sign-in failed."); setOauthLoading(null); return; }
          if (result.redirected) return;
          navigate("/dashboard");
        } catch { toast.error("Something went wrong."); setOauthLoading(null); }
      }}>
      {oauthLoading === "google" ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Google…</>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </>
      )}
    </Button>
    <Button type="button" variant="outline" className="w-full" size="lg" disabled={disabled || !!oauthLoading}
      onClick={async () => {
        setOauthLoading("apple");
        try {
          const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
          if (result.error) { toast.error("Apple sign-in failed."); setOauthLoading(null); return; }
          if (result.redirected) return;
          navigate("/dashboard");
        } catch { toast.error("Something went wrong."); setOauthLoading(null); }
      }}>
      {oauthLoading === "apple" ? (
        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to Apple…</>
      ) : (
        <>
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Continue with Apple
        </>
      )}
    </Button>
  </>
);

export default AuthPage;
