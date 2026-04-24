import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, Mail, Lock, User, Phone, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called once auth is successful (user is signed in). */
  onAuthSuccess: () => void;
  /** Optional context shown at the top — e.g. "Sign in to continue with Pro". */
  contextLabel?: string;
}

/**
 * Inline auth popup for the pricing flow. Shows Sign In / Sign Up tabs and
 * resolves with `onAuthSuccess` after a successful login or signup — no
 * navigation, no page redirect. The caller can then trigger payment.
 */
export const AuthModal = ({ open, onOpenChange, onAuthSuccess, contextLabel }: AuthModalProps) => {
  const { signIn, signUp, user } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  // Reset form whenever the modal closes
  useEffect(() => {
    if (!open) {
      setForm({ name: "", email: "", phone: "", password: "" });
      setTab("signin");
      setShowPassword(false);
      setSubmitting(false);
    }
  }, [open]);

  // If a user appears while the modal is open (e.g. after signup auto-login),
  // close the modal and trigger the success callback.
  useEffect(() => {
    if (open && user) {
      onOpenChange(false);
      onAuthSuccess();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, open]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error("Please enter your email and password");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await signIn(form.email.trim().toLowerCase(), form.password);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Welcome back!");
      // The user effect above will fire onAuthSuccess + close.
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Please enter your name"); return; }
    if (!form.email.trim()) { toast.error("Please enter your email"); return; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setSubmitting(true);
    try {
      const { error } = await signUp(
        form.email.trim().toLowerCase(),
        form.password,
        form.name.trim(),
        form.phone.trim()
      );
      if (error) {
        toast.error(error.message);
        return;
      }
      // Two possible outcomes:
      // 1. Email confirmation required → no session yet → tell user to verify, but
      //    still close the modal. They can retry payment after verifying.
      // 2. Auto-confirm enabled → session is created → user effect fires success.
      toast.success("Account created! Continuing to payment…");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-primary" />
            {contextLabel || "Sign in to continue"}
          </DialogTitle>
          <DialogDescription>
            One quick step before checkout — your selected plan will open right after.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signin-email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-email" type="email" autoFocus required
                      placeholder="you@example.com"
                      className="pl-9"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signin-password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signin-password" type={showPassword ? "text" : "password"} required
                      placeholder="••••••••"
                      className="pl-9 pr-9"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Sign in & continue
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm">Full name</Label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-name" type="text" autoFocus required
                      placeholder="Your name"
                      className="pl-9"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm">Email</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-email" type="email" required
                      placeholder="you@example.com"
                      className="pl-9"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone" className="text-sm">Phone (optional)</Label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-phone" type="tel"
                      placeholder="+91 98765 43210"
                      className="pl-9"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm">Password</Label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="signup-password" type={showPassword ? "text" : "password"} required
                      placeholder="At least 6 characters"
                      className="pl-9 pr-9"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Create account & continue
                </Button>
                <p className="text-[11px] text-muted-foreground text-center pt-1">
                  By signing up you agree to our Terms and Privacy.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
