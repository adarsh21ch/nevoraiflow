import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, IndianRupee } from "lucide-react";

const AdminSubscriptionsPage = () => {
  const [search, setSearch] = useState("");

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["admin-all-subscriptions"],
    queryFn: async () => {
      const { data } = await supabase.from("user_subscriptions").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email");
      return data || [];
    },
  });

  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  const filtered = subscriptions.filter((s) => {
    if (!search) return true;
    const profile = profileMap[s.user_id];
    return profile?.full_name?.toLowerCase().includes(search.toLowerCase()) || profile?.email?.toLowerCase().includes(search.toLowerCase()) || s.plan_key.toLowerCase().includes(search.toLowerCase());
  });

  const totalRevenue = subscriptions.reduce((a, s) => a + (s.amount_paid || 0), 0);
  const activeCount = subscriptions.filter((s) => s.status === "active" && s.tier !== "free").length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-heading font-bold">Subscriptions</h1>

        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-2xl font-heading font-bold">₹{totalRevenue.toLocaleString("en-IN")}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Active Paid</p>
            <p className="text-2xl font-heading font-bold">{activeCount}</p>
          </div>
          <div className="glass-card p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Subscriptions</p>
            <p className="text-2xl font-heading font-bold">{subscriptions.length}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="pl-9 bg-muted border-border" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="p-4 text-xs text-muted-foreground font-medium">User</th>
                  <th className="p-4 text-xs text-muted-foreground font-medium">Plan</th>
                  <th className="p-4 text-xs text-muted-foreground font-medium">Status</th>
                  <th className="p-4 text-xs text-muted-foreground font-medium">Amount</th>
                  <th className="p-4 text-xs text-muted-foreground font-medium">Expires</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const profile = profileMap[s.user_id];
                  return (
                    <tr key={s.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                      <td className="p-4">
                        <p className="font-medium">{profile?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{profile?.email}</p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.tier === "pro" ? "bg-warning/10 text-warning" : s.tier === "basic" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {s.plan_key}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "active" ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4">₹{(s.amount_paid || 0).toLocaleString("en-IN")}</td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {s.expires_at ? new Date(s.expires_at).toLocaleDateString("en-IN") : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminSubscriptionsPage;
