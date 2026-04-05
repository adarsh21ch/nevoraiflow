import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, Layers, Video, BarChart3 } from "lucide-react";

const AdminDashboard = () => {
  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => { const { data } = await supabase.from("profiles").select("*"); return data || []; },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Admin features require the admin role. Platform-wide analytics and user management.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Users, label: "Total Users", value: String(profiles.length) },
            { icon: Layers, label: "Total Funnels", value: "—" },
            { icon: Video, label: "Total Videos", value: "—" },
            { icon: BarChart3, label: "MRR", value: "₹0" },
          ].map((k) => (
            <div key={k.label} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2"><k.icon size={16} className="text-primary" /><span className="text-xs text-muted-foreground">{k.label}</span></div>
              <div className="text-2xl font-heading font-bold">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="glass-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Full admin panel with user management, KYC review, and platform settings will be built in the next iteration.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
