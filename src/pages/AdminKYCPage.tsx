import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useState } from "react";
import { Shield, Check, X, Eye, MapPin, FileText, CreditCard } from "lucide-react";
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

  // Get signed URL for document preview
  const getDocUrl = async (path: string) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    return data?.signedUrl || null;
  };

  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

  const openReview = async (kyc: any) => {
    setSelectedKyc(kyc);
    setRejectionReason("");
    if (kyc.doc_image_url) {
      const url = await getDocUrl(kyc.doc_image_url);
      setDocPreviewUrl(url);
    } else {
      setDocPreviewUrl(null);
    }
  };

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  const DocIcon = (type: string) => type === "pan" ? CreditCard : FileText;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Creator Verification Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Review and approve creator identity submissions.</p>
        </div>

        {pending.length === 0 && !isLoading ? (
          <div className="glass-card p-12 text-center">
            <Shield size={40} className="text-muted-foreground mx-auto mb-3" />
            <h3 className="font-heading font-semibold mb-2">No pending submissions</h3>
            <p className="text-sm text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Pending ({pending.length})</h2>
            {pending.map((kyc) => {
              const Icon = DocIcon(kyc.doc_type || "");
              return (
                <div key={kyc.id} className="glass-card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{kyc.full_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        {kyc.city && <span className="flex items-center gap-0.5"><MapPin size={10} />{kyc.city}</span>}
                        <span>·</span>
                        <span>{kyc.doc_type === "pan" ? "PAN" : kyc.doc_type === "aadhaar" ? "Aadhaar" : "Document"}</span>
                        <span>·</span>
                        <span>{new Date(kyc.submitted_at!).toLocaleDateString("en-IN")}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openReview(kyc)}>
                      <Eye size={14} /> Review
                    </Button>
                    <Button size="sm" variant="default" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => reviewMutation.mutate({ id: kyc.id, userId: kyc.user_id, action: "approved" })}>
                      <Check size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {reviewed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Reviewed ({reviewed.length})</h2>
            {reviewed.map((kyc) => (
              <div key={kyc.id} className="glass-card p-4 flex items-center justify-between opacity-70">
                <div>
                  <p className="font-medium text-sm">{kyc.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${kyc.status === "approved" ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
                    {kyc.status === "approved" ? "Verified" : "Rejected"}
                  </span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => openReview(kyc)}><Eye size={14} /></Button>
              </div>
            ))}
          </div>
        )}

        <Dialog open={!!selectedKyc} onOpenChange={(o) => { if (!o) { setSelectedKyc(null); setDocPreviewUrl(null); } }}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Verification Details</DialogTitle>
            </DialogHeader>
            {selectedKyc && (
              <div className="space-y-4 text-sm">
                <div className="rounded-xl border border-border divide-y divide-border">
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground">Full Name</span>
                    <span className="font-medium">{selectedKyc.full_name}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="font-medium">{[selectedKyc.city, selectedKyc.state].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground">Document Type</span>
                    <span className="font-medium">{selectedKyc.doc_type === "pan" ? "PAN Card" : selectedKyc.doc_type === "aadhaar" ? "Aadhaar Card" : "—"}</span>
                  </div>
                  <div className="flex justify-between px-4 py-3">
                    <span className="text-xs text-muted-foreground">Document Number</span>
                    <span className="font-medium font-mono">
                      {selectedKyc.pan_number || selectedKyc.aadhar_number || "—"}
                    </span>
                  </div>
                </div>

                {/* Document preview */}
                {docPreviewUrl && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Uploaded Document</p>
                    <a href={docPreviewUrl} target="_blank" rel="noopener noreferrer">
                      <img src={docPreviewUrl} alt="ID Document" className="rounded-xl border border-border max-h-64 w-full object-contain bg-muted" />
                    </a>
                  </div>
                )}

                {selectedKyc.status === "pending" && (
                  <div className="border-t border-border pt-4 space-y-3">
                    <Textarea
                      placeholder="Rejection reason (required if rejecting)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="bg-muted border-border"
                    />
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={() => reviewMutation.mutate({ id: selectedKyc.id, userId: selectedKyc.user_id, action: "approved" })}
                      >
                        <Check size={14} /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={!rejectionReason.trim()}
                        onClick={() => reviewMutation.mutate({ id: selectedKyc.id, userId: selectedKyc.user_id, action: "rejected" })}
                      >
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedKyc.rejection_reason && selectedKyc.status === "rejected" && (
                  <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
                    <p className="text-xs text-muted-foreground">Rejection Reason</p>
                    <p className="text-sm mt-1">{selectedKyc.rejection_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminKYCPage;
