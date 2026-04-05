import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, Check, X, Clock, AlertTriangle } from "lucide-react";

const KYCPage = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    full_name: "", pan_number: "", aadhar_number: "",
    bank_account_number: "", bank_account_confirm: "", bank_ifsc: "", bank_account_name: "", bank_name: "",
  });

  const { data: kyc } = useQuery({
    queryKey: ["kyc", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("user_kyc_submissions").select("*").eq("user_id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const submitKyc = useMutation({
    mutationFn: async () => {
      await supabase.from("user_kyc_submissions").upsert({
        user_id: user!.id,
        full_name: form.full_name,
        pan_number: form.pan_number,
        aadhar_number: form.aadhar_number,
        bank_account_number: form.bank_account_number,
        bank_ifsc: form.bank_ifsc,
        bank_account_name: form.bank_account_name,
        bank_name: form.bank_name,
        status: "pending",
      }, { onConflict: "user_id" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc"] });
      toast.success("KYC submitted for review!");
    },
  });

  const statusBanner = () => {
    if (!kyc) return (
      <div className="glass-card p-4 flex items-center gap-3 border-primary/30">
        <Shield className="text-primary" size={20} />
        <div><p className="text-sm font-medium">Get Verified</p><p className="text-xs text-muted-foreground">Complete KYC to build trust with your leads.</p></div>
      </div>
    );
    if (kyc.status === "pending") return (
      <div className="glass-card p-4 flex items-center gap-3 border-warning/30">
        <Clock className="text-warning" size={20} />
        <div><p className="text-sm font-medium">KYC Under Review</p><p className="text-xs text-muted-foreground">Your documents are being verified (1-2 business days).</p></div>
      </div>
    );
    if (kyc.status === "approved") return (
      <div className="glass-card p-4 flex items-center gap-3 border-success/30">
        <Check className="text-success" size={20} />
        <div><p className="text-sm font-medium">KYC Verified ✅</p><p className="text-xs text-muted-foreground">Your identity has been verified.</p></div>
      </div>
    );
    return (
      <div className="glass-card p-4 flex items-center gap-3 border-destructive/30">
        <X className="text-destructive" size={20} />
        <div><p className="text-sm font-medium">KYC Rejected</p><p className="text-xs text-muted-foreground">Reason: {kyc.rejection_reason || "—"}. Please re-submit.</p></div>
      </div>
    );
  };

  const showForm = !kyc || kyc.status === "rejected";

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">KYC Verification</h1>
        {statusBanner()}

        {showForm && (
          <div className="glass-card p-6">
            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "gradient-primary" : "bg-muted"}`} />
              ))}
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-heading font-semibold">Personal Details</h3>
                <div><Label>Full Legal Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 bg-muted border-border" /></div>
                <div><Label>PAN Card Number</Label><Input value={form.pan_number} onChange={(e) => setForm({ ...form, pan_number: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} className="mt-1 bg-muted border-border" /></div>
                <div><Label>Aadhaar Number</Label><Input value={form.aadhar_number} onChange={(e) => setForm({ ...form, aadhar_number: e.target.value.replace(/\D/g, "") })} placeholder="1234 5678 9012" maxLength={12} className="mt-1 bg-muted border-border" /></div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-heading font-semibold">Bank Details</h3>
                <div><Label>Account Holder Name</Label><Input value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} className="mt-1 bg-muted border-border" /></div>
                <div><Label>Account Number</Label><Input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} className="mt-1 bg-muted border-border" /></div>
                <div><Label>Confirm Account Number</Label><Input value={form.bank_account_confirm} onChange={(e) => setForm({ ...form, bank_account_confirm: e.target.value })} className="mt-1 bg-muted border-border" /></div>
                <div><Label>IFSC Code</Label><Input value={form.bank_ifsc} onChange={(e) => setForm({ ...form, bank_ifsc: e.target.value.toUpperCase() })} className="mt-1 bg-muted border-border" /></div>
                <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} className="mt-1 bg-muted border-border" /></div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <h3 className="font-heading font-semibold">Review & Submit</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Name</span><span>{form.full_name}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">PAN</span><span>{form.pan_number}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Aadhaar</span><span>{form.aadhar_number}</span></div>
                  <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Bank</span><span>{form.bank_name}</span></div>
                  <div className="flex justify-between py-2"><span className="text-muted-foreground">Account</span><span>****{form.bank_account_number.slice(-4)}</span></div>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
              <div className="flex-1" />
              {step < 3 ? (
                <Button variant="default" onClick={() => setStep(step + 1)}>Next</Button>
              ) : (
                <Button variant="hero" onClick={() => submitKyc.mutate()} disabled={submitKyc.isPending}>
                  {submitKyc.isPending ? "Submitting..." : "Submit KYC"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default KYCPage;
