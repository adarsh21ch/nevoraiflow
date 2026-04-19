import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { DailyViewsCard } from "@/components/DailyViewsCard";
import { Layers, Users, Eye, IndianRupee, TrendingUp, Radio, Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user, profile } = useAuth();

  const { data: funnels = [] } = useQuery({
    queryKey: ["my-funnels", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("funnels").select("*").eq("owner_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: leadCount = 0 } = useQuery({
    queryKey: ["total-leads", user?.id],
    queryFn: async () => {
      const funnelIds = funnels.map((f) => f.id);
      if (!funnelIds.length) return 0;
      const { count } = await supabase.from("funnel_leads").select("*", { count: "exact", head: true }).in("funnel_id", funnelIds);
      return count || 0;
    },
    enabled: funnels.length > 0,
  });

  const totalViews = funnels.reduce((a, f) => a + (f.total_views || 0), 0);
  const publishedCount = funnels.filter((f) => f.is_published).length;
  const convRate = totalViews > 0 ? ((leadCount / totalViews) * 100).toFixed(1) : "0";

  const kpis = [
    { icon: Layers, label: "Total Funnels", value: String(funnels.length), sub: `${publishedCount} published`, iconClass: "stat-icon" },
    { icon: Users, label: "Total Leads", value: String(leadCount), sub: "All time", iconClass: "stat-icon-success" },
    { icon: Eye, label: "Video Plays", value: totalViews.toLocaleString("en-IN"), sub: "All time", iconClass: "stat-icon" },
    { icon: IndianRupee, label: "Payments", value: "₹0", sub: "This month", iconClass: "stat-icon-warning" },
    { icon: TrendingUp, label: "Conversion Rate", value: `${convRate}%`, sub: "Leads / Views", iconClass: "stat-icon" },
    { icon: Radio, label: "Live Broadcast", value: "None", sub: "No active broadcast", iconClass: "stat-icon" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8 overflow-x-hidden">
        <UpgradeBanner />
        <div>
          <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
          <div className="page-header-accent" />
          <p className="text-sm text-muted-foreground mt-2">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}! Here's your overview.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <Link to="/funnels/create" className="flex-1 sm:flex-none">
            <Button variant="hero" className="w-full"><Plus size={16} /> Create Funnel</Button>
          </Link>
          <Link to="/videos" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full"><Eye size={16} /> Add Video</Button>
          </Link>
        </div>

        <DailyViewsCard />

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="premium-card p-5 group">
              <div className="flex items-center gap-3 mb-3">
                <div className={`${kpi.iconClass} group-hover:scale-105 transition-transform`}>
                  <kpi.icon size={18} className="text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <div className="text-2xl font-heading font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {funnels.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <div className="stat-icon mx-auto mb-4 w-16 h-16 rounded-2xl">
              <Layers size={28} className="text-primary" />
            </div>
            <h3 className="text-lg font-heading font-semibold mb-2">No funnels yet</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">Create your first video funnel and start capturing leads on autopilot.</p>
            <Link to="/funnels/create"><Button variant="hero" size="lg">Create Your First Funnel</Button></Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading font-semibold">Recent Funnels</h2>
              <Link to="/funnels" className="text-sm text-primary hover:underline flex items-center gap-1">View all <ArrowRight size={14} /></Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {funnels.slice(0, 3).map((f) => (
                <Link to={`/funnels/${f.id}`} key={f.id} className="premium-card p-5 group">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${f.is_published ? "bg-success" : "bg-muted-foreground"}`} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${f.is_published ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                      {f.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                  <h3 className="font-medium text-sm mb-1 truncate">{f.title}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye size={12} /> {f.total_views || 0}</span>
                    <span className="flex items-center gap-1"><Users size={12} /> {f.total_leads || 0}</span>
                    <span className="flex items-center gap-1"><IndianRupee size={12} /> {f.total_payments || 0}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
