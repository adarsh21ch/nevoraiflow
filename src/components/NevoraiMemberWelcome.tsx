import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useNevoraiMember } from "@/hooks/useNevoraiMember";
import { useAuth } from "@/hooks/useAuth";

/**
 * One-time welcome popup shown to a Nevorai Member after their access is granted.
 * Uses profiles.member_welcome_shown to ensure it only appears once per user.
 */
export const NevoraiMemberWelcome = () => {
  const { user } = useAuth();
  const { isMember, welcomeShown, isLoading, markWelcomeShown } = useNevoraiMember();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user || isLoading) return;
    if (isMember && !welcomeShown) {
      setOpen(true);
    }
  }, [user, isMember, welcomeShown, isLoading]);

  const handleClose = async () => {
    setOpen(false);
    await markWelcomeShown();
  };

  if (!isMember) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-400/20 to-primary/20 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="text-teal-400" size={26} />
          </div>
          <DialogTitle className="text-center text-xl">Welcome, Nevorai Member 🎉</DialogTitle>
          <DialogDescription className="text-center">
            Your Individual plan is active — included with your Nevorai Pro subscription.
            Create funnels, landing pages, and reach your audience without limits.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Get started
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
