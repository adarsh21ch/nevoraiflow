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
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);

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
      setDocPreviewUrl(null);
      setRejectionReason("");
    },
  });

  const getDocUrl = async (path: string) => {
    if (!path) return null;
    const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(path, 300);
    return data?.signedUrl || null;
  };

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
      <div className="w-full max-w-full space-y-5 overflow-x-hidden">
        <div>
          <h1 className="text-xl font-heading font-bold sm:text-2xl">Creator Verification Queue</h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">Review and approve creator identity submissions.</p>
        </div>

        {pending.length === 0 && !isLoading ? (
          <div className="glass-card p-12 text-center">
            <Shield size={40} className="mx-auto mb-3 text-muted-foreground" />
            <h3 className="mb-2 font-heading font-semibold">No pending submissions</h3>
            <p className="text-sm text-muted-foreground">All caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Pending ({pending.length})</h2>
            {pending.map((kyc) => {
              const Icon = DocIcon(kyc.doc_type || "");
              return (
                <div key={kyc.id} className="glass-card space-y-3 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4 sm:space-y-0">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{kyc.full_name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
                        {kyc.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin size={10} />
                            {kyc.city}
                          </span>
                        )}
                        <span>{kyc.doc_type === "pan" ? "PAN" : kyc.doc_type === "aadhaar" ? "Aadhaar" : "Document"}</span>
                        <span>{new Date(kyc.submitted_at!).toLocaleDateString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full gap-2 sm:w-auto">
                    <Button size="sm" variant="outline" className="h-10 flex-1 text-xs sm:flex-none" onClick={() => openReview(kyc)}>
                      <Eye size={14} /> Review
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-10 flex-1 bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none"
                      onClick={() => reviewMutation.mutate({ id: kyc.id, userId: kyc.user_id, action: "approved" })}
                    >
                      <Check size={14} /> Approve
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
              <div key={kyc.id} className="glass-card flex flex-col gap-3 p-4 opacity-70 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{kyc.full_name}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs ${kyc.status === "approved" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {kyc.status === "approved" ? "Verified" : "Rejected"}
                  </span>
                </div>
                <Button size="sm" variant="ghost" className="h-10 self-start sm:self-auto" onClick={() => openReview(kyc)}>
                  <Eye size={14} /> View
                </Button>
              </div>
            ))}
          </div>
        )}

        <Dialog
          open={!!selectedKyc}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedKyc(null);
              setDocPreviewUrl(null);
            }
          }}
        >
          <DialogContent className="max-h-[85vh] w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] overflow-y-auto border-border bg-card sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-heading">Verification Details</DialogTitle>
            </DialogHeader>
            {selectedKyc && (
              <div className="space-y-4 text-sm">
                <div className="divide-y divide-border rounded-xl border border-border">
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-xs text-muted-foreground">Full Name</span>
                    <span className="max-w-[60%] break-words text-right font-medium">{selectedKyc.full_name}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-xs text-muted-foreground">Location</span>
                    <span className="max-w-[60%] break-words text-right font-medium">{[selectedKyc.city, selectedKyc.state].filter(Boolean).join(", ") || "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-xs text-muted-foreground">Document Type</span>
                    <span className="max-w-[60%] break-words text-right font-medium">{selectedKyc.doc_type === "pan" ? "PAN Card" : selectedKyc.doc_type === "aadhaar" ? "Aadhaar Card" : "—"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 px-4 py-3">
                    <span className="text-xs text-muted-foreground">Document Number</span>
                    <span className="max-w-[60%] break-all text-right font-medium font-mono">{selectedKyc.pan_number || selectedKyc.aadhar_number || "—"}</span>
                  </div>
                </div>

                {docPreviewUrl && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Uploaded Document</p>
                    <a href={docPreviewUrl} target="_blank" rel="noopener noreferrer">
                      <img src={docPreviewUrl} alt="ID Document" className="max-h-64 w-full rounded-xl border border-border bg-muted object-contain" />
                    </a>
                  </div>
                )}

                {selectedKyc.status === "pending" && (
                  <div className="space-y-3 border-t border-border pt-4">
                    <Textarea
                      placeholder="Rejection reason (required if rejecting)"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="border-border bg-muted"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        className="h-11 flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => reviewMutation.mutate({ id: selectedKyc.id, userId: selectedKyc.user_id, action: "approved" })}
                      >
                        <Check size={14} /> Approve
                      </Button>
                      <Button
                        variant="destructive"
                        className="h-11 flex-1"
                        disabled={!rejectionReason.trim()}
                        onClick={() => reviewMutation.mutate({ id: selectedKyc.id, userId: selectedKyc.user_id, action: "rejected" })}
                      >
                        <X size={14} /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {selectedKyc.rejection_reason && selectedKyc.status === "rejected" && (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-xs text-muted-foreground">Rejection Reason</p>
                    <p className="mt-1 text-sm break-words">{selectedKyc.rejection_reason}</p>
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
