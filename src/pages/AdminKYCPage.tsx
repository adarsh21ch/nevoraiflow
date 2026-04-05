import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Check, X, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AdminKYCPage = () => {
  const queryClient = useQueryClient();
  const [selectedKyc, setSelectedKyc] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["admin-kyc-all"],
    queryFn: async () => {
      const { data } = await supabase.from("user_kyc_submissions").select("*").order("submitted_at", { ascending: false });
      return data || [];
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, userId, action }: { id: string; userId: string; action: "approved" | "rejected" }) => {
      const { error } = await supabase.from("user_kyc_submissions").update({
        status: action,
        reviewed_at: new Date().toISOString(),
        rejection_reason: action === "rejected" ? rejectionReason : null,
      }).eq("id", id);
      if (error) throw error;

      await supabase.from("profiles").update({
        kyc_status: action === "approved" ? "verified" : "rejected",
        kyc_verified_at: action === "approved" ? new Date().toISOString() : null,
      }).eq("id", userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-kyc-all"] });
      toast.success("KYC review saved");
      setSelectedKyc(null);
      setRejectionReason("");
    },
  });

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">KYC Review Queue</h1>

        {pending.length === 0 && !isLoading ? (
          <div className="glass-card p-12 text-center">
            <Shield size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold mb-2">No pending KYC submissions</h3>
            <p className="text-sm text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Pending ({pending.length})</h2>
            {pending.map((kyc) => (
              <div key={kyc.id} className="glass-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{kyc.full_name}</p>
                  <p className="text-xs text-muted-foreground">Submitted {new Date(kyc.submitted_at!).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedKyc(kyc)}><Eye size={14} /> Review</Button>
                  <Button size="sm" variant="hero" onClick={() => reviewMutation.mutate({ id: kyc.id, userId: kyc.user_id, action: "approved" })}><Check size={14} /></Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {reviewed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Reviewed ({reviewed.length})</h2>
            {reviewed.map((kyc) => (
              <div key={kyc.id} className="glass-card p-4 flex items-center justify-between opacity-70">
                <div>
                  <p className="font-medium text-sm">{kyc.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${kyc.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{kyc.status}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedKyc(kyc)}><Eye size={14} /></Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selectedKyc} onOpenChange={(o) => !o && setSelectedKyc(null)}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">KYC Details — {selectedKyc?.full_name}</DialogTitle>
            </DialogHeader>
            {selectedKyc && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-muted-foreground">PAN Number</p><p className="font-medium">{selectedKyc.pan_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Aadhaar Number</p><p className="font-medium">{selectedKyc.aadhar_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Bank Name</p><p className="font-medium">{selectedKyc.bank_name || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">IFSC</p><p className="font-medium">{selectedKyc.bank_ifsc || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Account Number</p><p className="font-medium">{selectedKyc.bank_account_number || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Account Name</p><p className="font-medium">{selectedKyc.bank_account_name || "—"}</p></div>
                </div>

                {selectedKyc.status === "pending" && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <Textarea placeholder="Rejection reason (optional)" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="bg-muted border-border" />
                    <div className="flex gap-2">
                      <Button variant="hero" className="flex-1" onClick={() => reviewMutation.mutate({ id: selectedKyc.id, userId: selectedKyc.user_id, action: "approved" })}>
                        <Check size={14} /> Approve
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => reviewMutation.mutate({ id: selectedKyc.id, userId: selectedKyc.user_id, action: "rejected" })}>
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminKYCPage;
