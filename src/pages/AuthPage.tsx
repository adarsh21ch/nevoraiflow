import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { Eye, EyeOff, Mail, Lock, User, Phone, Sparkles, ArrowLeft, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Stage = "email" | "login" | "signup" | "nevorai-otp";

interface NevoraiInfo {
  fullName?: string | null;
  isPro: boolean;
}

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();

  const [stage, setStage] = useState<Stage>("email");
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

  // Auto-detect state
  const [autoCheckStatus, setAutoCheckStatus] = useState<"idle" | "checking" | "match" | "none">("idle");
  const [autoCheckInfo, setAutoCheckInfo] = useState<NevoraiInfo | null>(null);
  const lookupCacheRef = useRef<Map<string, { exists: boolean; isPro: boolean; fullName: string | null }>>(new Map());
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
        setAutoCheckInfo({ fullName: cached.fullName, isPro: cached.isPro });
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
        };
        lookupCacheRef.current.set(email, result);

        // Min display time for "checking" to avoid flicker
        const elapsed = Date.now() - checkStartRef.current;
        const wait = Math.max(0, 300 - elapsed);
        setTimeout(() => {
          if (controller.signal.aborted) return;
          if (result.exists) {
            setAutoCheckStatus("match");
            setAutoCheckInfo({ fullName: result.fullName, isPro: result.isPro });
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

  // Move user into the OTP stage when they confirm a detected match
  const enterOtpFromAutoDetect = () => {
    if (!autoCheckInfo) return;
    setNevoraiInfo(autoCheckInfo);
    setStage("nevorai-otp");
    // Auto-send the OTP so they don't need an extra click
    handleSendOtp();
  };

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
  };

  // Step 1: Email continue — branch into login / signup / nevorai-otp
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    try {
      // Check Nevorai bridge
      const { data, error } = await supabase.functions.invoke("verify-nevorai-member", {
        body: { email: form.email.trim().toLowerCase(), mode: "lookup" },
      });
      if (error) throw error;

      if (data?.exists) {
        setNevoraiInfo({ fullName: data.fullName, isPro: !!data.isPro });
        setStage("nevorai-otp");
        return;
      }
      // Not in Nevorai — show signup form (login tab still reachable via toggle)
      setStage("signup");
    } catch (e: any) {
      console.error("Lookup failed", e);
      // Graceful fallback: show signup form
      setStage("signup");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2a: Send OTP for Nevorai users
  const handleSendOtp = async () => {
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-nevorai-member", {
        body: { email: form.email.trim().toLowerCase(), mode: "send_otp" },
      });
      if (error) throw error;
      if (data?.otpSent) {
        toast.success("Verification code sent to your email");
      } else {
        toast.error(data?.error || "Could not send code");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not send code");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2b: Verify OTP and sign in / create account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-nevorai-otp", {
        body: { email: form.email.trim().toLowerCase(), code: otp },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Verification failed");
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
        navigate("/dashboard");
      } else {
        toast.error("Verified, but session could not be created. Try signing in.");
        setStage("login");
      }
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2c: Brand-new signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Please enter your name"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    try {
      const { error } = await signUp(form.email, form.password, form.name, form.phone);
      if (error) { toast.error(error.message); return; }
      toast.success("Account created! Please check your email to verify.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 2d: Existing nFlow user login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockUntil) {
      toast.error("Too many attempts. Please wait 30 seconds.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= 3) {
          setLockUntil(Date.now() + 30000);
          setFailCount(0);
          toast.error("Too many failed attempts. Locked for 30 seconds.");
        } else {
          toast.error(error.message);
        }
        return;
      }
      toast.success("Welcome back!");
      navigate("/dashboard");
    } finally {
      setSubmitting(false);
    }
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
          <Link to="/" className="inline-block"><Logo size="lg" /></Link>
          <p className="text-sm mt-3" style={{ color: "#8899AA" }}>
            {stage === "email" && "Welcome — let's get you in."}
            {stage === "login" && "Welcome back! Enter your password."}
            {stage === "signup" && "Create your nFlow account."}
            {stage === "nevorai-otp" && (nevoraiInfo?.isPro
              ? "You're a Nevorai Pro member — verify to unlock free."
              : "You're part of the Nevorai family.")}
          </p>
        </div>

        <div className="auth-card p-8">
          {/* Back button on every stage past email */}
          {stage !== "email" && (
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
              </div>
              <Button variant="hero" className="w-full" size="lg" disabled={submitting} style={{ borderRadius: "12px" }}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Checking…
                  </span>
                ) : "Continue"}
              </Button>

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
                <div className="relative flex justify-center text-xs"><span className="px-2" style={{ background: "#0F1628", color: "#8899AA" }}>or</span></div>
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
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    className="auth-input text-center tracking-[0.5em] text-lg"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  />
                  <p className="text-xs" style={{ color: "#8899AA" }}>
                    Sent to <span className="text-foreground">{form.email}</span>. Expires in 10 min.
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
                  disabled={submitting}
                  onClick={handleSendOtp}
                >
                  Send code
                </Button>
              </form>
            </div>
          )}

          {/* STAGE: SIGNUP (brand new) */}
          {stage === "signup" && (
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
                  <Input className="auth-input pl-9" value={form.email} disabled />
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
                <button type="button" onClick={() => setStage("signup")} className="text-xs hover:underline" style={{ color: "#8899AA" }}>
                  No account yet? <span className="text-primary">Create one</span>
                </button>
              </div>
            </form>
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
