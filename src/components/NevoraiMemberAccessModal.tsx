import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

interface NevoraiMemberAccessModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  fullName?: string;
  onSuccess?: () => void;
}

type Step = "intro" | "otp" | "success";

export const NevoraiMemberAccessModal = ({
  open,
  onOpenChange,
  initialEmail,
  fullName,
  onSuccess,
}: NevoraiMemberAccessModalProps) => {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("intro");
  const [email, setEmail] = useState(initialEmail || "");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const sendOtp = async () => {
    if (!email) {
      toast.error("Email is required");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-nevorai-member", {
        body: { email, mode: "send_otp" },
      });
      if (error) throw error;
      if (!data?.isMember) {
        toast.error("This email is not registered as a Nevorai Pro member.");
        return;
      }
      if (data?.otpSent) {
        toast.success("Code sent to your email");
        setStep("otp");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not send code");
    } finally {
      setLoading(false);
    }
  };

  const confirmOtp = async () => {
    if (!user) {
      toast.error("Please sign in first to claim access");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("confirm-nevorai-otp", {
        body: { email, code },
      });
      if (error) throw error;
      if (!data?.success) {
        toast.error(data?.error || "Could not verify");
        return;
      }
      setStep("success");
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["user-plan"] });
      queryClient.invalidateQueries({ queryKey: ["nevorai-member"] });
      onSuccess?.();
    } catch (e: any) {
      toast.error(e?.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {step === "intro" && (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="text-primary" size={22} />
              </div>
              <DialogTitle className="text-center">You're a Nevorai Member</DialogTitle>
              <DialogDescription className="text-center">
                {fullName ? `Welcome back, ${fullName}. ` : ""}
                We'll send a 6-digit code to your registered email to unlock the Individual plan.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                id="member-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={!!initialEmail}
              />
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
                Not now
              </Button>
              <Button onClick={sendOtp} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Mail size={16} />}
                Send code
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "otp" && (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <ShieldCheck className="text-primary" size={22} />
              </div>
              <DialogTitle className="text-center">Enter your code</DialogTitle>
              <DialogDescription className="text-center">
                We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>. It expires in 10 minutes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Label htmlFor="member-otp">Verification code</Label>
              <Input
                id="member-otp"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                className="text-center tracking-widest text-lg"
              />
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="ghost" onClick={() => setStep("intro")} disabled={loading}>
                Resend
              </Button>
              <Button onClick={confirmOtp} disabled={loading || code.length !== 6} className="gap-2">
                {loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                Verify & unlock
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles className="text-success" size={22} />
              </div>
              <DialogTitle className="text-center">Individual plan unlocked</DialogTitle>
              <DialogDescription className="text-center">
                Your Nevorai Member benefits are now active. No payment needed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)} className="w-full">Continue</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
