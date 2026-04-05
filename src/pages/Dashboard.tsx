import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Layers, Users, Eye, IndianRupee, TrendingUp, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const kpis = [
  { icon: Layers, label: "Total Funnels", value: "0", sub: "0 published" },
  { icon: Users, label: "Total Leads", value: "0", sub: "This month" },
  { icon: Eye, label: "Video Plays", value: "0", sub: "This month" },
  { icon: IndianRupee, label: "Payments", value: "₹0", sub: "This month" },
  { icon: TrendingUp, label: "Conversion Rate", value: "0%", sub: "Leads / Views" },
  { icon: Radio, label: "Live Broadcast", value: "None", sub: "No active broadcast" },
];

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's your overview.</p>
          </div>
          <Link to="/funnels/create">
            <Button variant="hero">+ Create Funnel</Button>
          </Link>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass-card p-5 group hover:border-primary/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <kpi.icon size={18} className="text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium">{kpi.label}</span>
              </div>
              <div className="text-2xl font-heading font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
            </div>
          ))}
        </div>

        {/* Empty state */}
        <div className="glass-card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Layers size={28} className="text-primary" />
          </div>
          <h3 className="text-lg font-heading font-semibold mb-2">No funnels yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Create your first video funnel and start capturing leads on autopilot.
          </p>
          <Link to="/funnels/create">
            <Button variant="hero" size="lg">Create Your First Funnel</Button>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
