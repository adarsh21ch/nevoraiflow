import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePlan } from "@/hooks/usePlan";
import { useWhatsAppSupport } from "@/hooks/useWhatsAppSupport";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  CreditCard, Calendar, Crown, ArrowRight, MessageCircle,
  CheckCircle2, XCircle, Clock, AlertTriangle, RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
  active: { label: "Active", icon: CheckCircle2, color: "text-green-600" },
  expired: { label: "Expired", icon: XCircle, color: "text-destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-muted-foreground" },
  payment_failed: { label: "Payment Failed", icon: AlertTriangle, color: "text-amber-600" },
  pending: { label: "Pending", icon: Clock, color: "text-amber-600" },
  replaced: { label: "Replaced", icon: RefreshCw, color: "text-muted-foreground" },
};

const BillingPage = () => {
  const { plan, isLoading } = usePlan();
  const { profile } = useAuth();
  const { openSupport } = useWhatsAppSupport();
  const status = statusConfig[plan.status] || statusConfig.active;
  const StatusIcon = status.icon;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl space-y-6">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="glass-card p-6 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-5 bg-muted animate-pulse rounded w-3/4" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold">Billing</h1>
          {plan.isPaid && (
            <Badge variant="outline" className="gap-1.5 border-primary/30 text-primary">
              <Crown size={12} /> {plan.tier === "pro" ? "Pro" : "Basic"} Plan
            </Badge>
          )}
        </div>

        {/* Plan Status Card */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${plan.isPaid ? "bg-primary/10" : "bg-muted"}`}>
                <CreditCard size={20} className={plan.isPaid ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div>
                <p className="font-medium capitalize">{plan.planKey.replace(/_/g, " ")}</p>
                <div className="flex items-center gap-1.5">
                  <StatusIcon size={13} className={status.color} />
                  <span className={`text-xs ${status.color}`}>{status.label}</span>
                </div>
              </div>
            </div>
            {plan.amountPaid && plan.amountPaid > 0 && (
              <p className="text-xl font-heading font-bold">₹{plan.amountPaid}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            {plan.startedAt && (
              <div>
                <p className="text-muted-foreground text-xs">Started</p>
                <p className="font-medium">{format(new Date(plan.startedAt), "dd MMM yyyy")}</p>
              </div>
            )}
            {plan.expiresAt && (
              <div>
                <p className="text-muted-foreground text-xs">Expires</p>
                <p className="font-medium">{format(new Date(plan.expiresAt), "dd MMM yyyy")}</p>
              </div>
            )}
            {plan.billingType && (
              <div>
                <p className="text-muted-foreground text-xs">Billing</p>
                <p className="font-medium capitalize">{plan.billingType.replace(/_/g, " ")}</p>
              </div>
            )}
            {plan.daysLeft !== null && plan.daysLeft > 0 && (
              <div>
                <p className="text-muted-foreground text-xs">Days Left</p>
                <p className={`font-medium ${plan.isExpiringSoon ? "text-amber-600" : ""}`}>{plan.daysLeft}</p>
              </div>
            )}
          </div>

          {plan.razorpayPaymentId && (
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              Payment ID: {plan.razorpayPaymentId}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {(!plan.isPaid || plan.isExpired || plan.isExpiringSoon) && (
            <Link to="/upgrade">
              <Button className="gap-2">
                {plan.isExpired ? "Renew Plan" : plan.isExpiringSoon ? "Renew Now" : "Upgrade"}
                <ArrowRight size={16} />
              </Button>
            </Link>
          )}
          <Button variant="outline" className="gap-2" onClick={() => openSupport("Hi, I have a billing question about my Nevorai Flow account.")}>
            <MessageCircle size={16} /> Contact Support
          </Button>
        </div>

        {/* Support prompt for payment issues */}
        {plan.status === "payment_failed" && (
          <div className="glass-card p-5 border-destructive/20 bg-destructive/5 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              <p className="font-medium text-destructive">Payment failed</p>
            </div>
            <p className="text-sm text-muted-foreground">Your last payment didn't go through. Please try again or contact support.</p>
            <div className="flex gap-3">
              <Link to="/upgrade"><Button size="sm">Retry Payment</Button></Link>
              <Button size="sm" variant="outline" onClick={() => openSupport("Hi, my payment failed on Nevorai Flow. Can you help?")}>
                <MessageCircle size={14} className="mr-1.5" /> Get Help
              </Button>
            </div>
          </div>
        )}

        {plan.isPaid && !plan.isExpired && plan.status === "active" && (
          <div className="glass-card p-5 bg-primary/5 border-primary/10">
            <p className="text-sm text-muted-foreground">
              Need to change or cancel your plan? <button className="text-primary underline" onClick={() => openSupport("Hi, I'd like to change/cancel my Nevorai Flow plan.")}>Contact support</button> and we'll help you right away.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BillingPage;
