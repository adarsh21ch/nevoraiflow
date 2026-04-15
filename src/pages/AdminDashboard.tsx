import { AdminLayout } from "@/components/layout/AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Layers, Video, BarChart3, IndianRupee, Shield } from "lucide-react";

const AdminDashboard = () => {
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("id, full_name, email, created_at, kyc_status"); return data || []; },
  });

  const { data: funnels = [] } = useQuery({
    queryKey: ["admin-funnels-count"],
    queryFn: async () => { const { data } = await supabase.from("funnels").select("id, total_views, total_leads, total_payments"); return data || []; },
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["admin-videos-count"],
    queryFn: async () => { const { data } = await supabase.from("video_assets").select("id"); return data || []; },
  });

  const { data: subs = [] } = useQuery({
    queryKey: ["admin-subs"],
    queryFn: async () => { const { data } = await supabase.from("user_subscriptions").select("amount_paid, tier, status"); return data || []; },
  });

  const { data: kycPending = [] } = useQuery({
    queryKey: ["admin-kyc-pending"],
    queryFn: async () => { const { data } = await supabase.from("user_kyc_submissions").select("id").eq("status", "pending"); return data || []; },
  });

  const mrr = subs.filter((s) => s.status === "active" && s.tier !== "free").reduce((a, s) => a + (s.amount_paid || 0), 0);
  const totalViews = funnels.reduce((a, f) => a + ((f as any).total_views || 0), 0);
  const totalLeads = funnels.reduce((a, f) => a + ((f as any).total_leads || 0), 0);

  const kpis = [
    { icon: Users, label: "Total Users", value: String(profiles.length), iconClass: "stat-icon" },
    { icon: Layers, label: "Total Funnels", value: String(funnels.length), iconClass: "stat-icon" },
    { icon: Video, label: "Total Videos", value: String(videos.length), iconClass: "stat-icon" },
    { icon: BarChart3, label: "Total Views", value: totalViews.toLocaleString("en-IN"), iconClass: "stat-icon" },
    { icon: Users, label: "Total Leads", value: totalLeads.toLocaleString("en-IN"), iconClass: "stat-icon-success" },
    { icon: IndianRupee, label: "Total Revenue", value: `₹${mrr.toLocaleString("en-IN")}`, iconClass: "stat-icon-warning" },
    { icon: Shield, label: "KYC Pending", value: String(kycPending.length), iconClass: "stat-icon-destructive" },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
          <div className="page-header-accent" />
          <p className="text-sm text-muted-foreground mt-2">Platform overview and management.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="premium-card p-5 group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`${k.iconClass} group-hover:scale-105 transition-transform`}>
                  <k.icon size={18} className="text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{k.label}</span>
              </div>
              <div className="text-2xl font-heading font-bold">{k.value}</div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
