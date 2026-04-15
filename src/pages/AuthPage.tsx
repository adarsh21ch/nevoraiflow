import { useState } from "react";
import { useSearchParams, Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/landing/Logo";
import { Eye, EyeOff, Mail, Lock, User, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { signIn, signUp, user, loading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">(
    searchParams.get("tab") === "signup" ? "signup" : "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState(0);

  // Show loading spinner while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Use Navigate component instead of calling navigate() during render
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() < lockUntil) {
      toast.error("Too many attempts. Please wait 30 seconds.");
      return;
    }
    setSubmitting(true);
    try {
      if (tab === "signup") {
        if (!form.name.trim()) { toast.error("Please enter your name"); return; }
        if (!form.email.trim()) { toast.error("Please enter your email"); return; }
        if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
        const { error } = await signUp(form.email, form.password, form.name, form.phone);
        if (error) { toast.error(error.message); return; }
        toast.success("Account created! Please check your email to verify.");
      } else {
        if (!form.email.trim()) { toast.error("Please enter your email"); return; }
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
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-bg-subtle">
      <div className="absolute inset-0 animate-grid opacity-30" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block"><Logo size="lg" /></Link>
          <p className="text-sm text-muted-foreground mt-3">
            {tab === "login" ? "Welcome back! Sign in to your account." : "Create your free account and start building funnels."}
          </p>
        </div>
        <div className="glass-card p-8">
          <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
            {(["login", "signup"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all ${tab === t ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                {t === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {tab === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Full Name <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" placeholder="Your full name" className="pl-9 bg-muted border-border"
                    value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm">Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" className="pl-9 bg-muted border-border" required
                  value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            {tab === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Phone Number <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input id="phone" placeholder="+91 9876543210" className="pl-9 bg-muted border-border"
                    value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm">Password <span className="text-destructive">*</span></Label>
                {tab === "login" && <Link to="/auth/reset-password" className="text-xs text-primary hover:underline">Forgot password?</Link>}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                  className="pl-9 pr-10 bg-muted border-border" value={form.password} required
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <Button variant="hero" className="w-full" size="lg" disabled={submitting}>
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  {tab === "login" ? "Signing in..." : "Creating account..."}
                </span>
              ) : tab === "login" ? "Sign In" : "Create Account"}
            </Button>
            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div>
            </div>
            <Button type="button" variant="outline" className="w-full" size="lg" disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast.error("Google sign-in failed");
                    return;
                  }
                  if (result.redirected) return;
                  navigate("/dashboard");
                } finally {
                  setSubmitting(false);
                }
              }}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </Button>
            <Button type="button" variant="outline" className="w-full" size="lg" disabled={submitting}
              onClick={async () => {
                setSubmitting(true);
                try {
                  const result = await lovable.auth.signInWithOAuth("apple", {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast.error("Apple sign-in failed");
                    return;
                  }
                  if (result.redirected) return;
                  navigate("/dashboard");
                } finally {
                  setSubmitting(false);
                }
              }}>
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Continue with Apple
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
