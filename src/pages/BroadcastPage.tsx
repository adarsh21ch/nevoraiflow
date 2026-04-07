import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Radio, Plus } from "lucide-react";

const BroadcastPage = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold">Broadcast</h1>
            <p className="text-sm text-muted-foreground mt-1">Schedule and manage live broadcasts for your audience.</p>
          </div>
          <Button variant="hero" disabled>
            <Plus size={16} /> New Broadcast
          </Button>
        </div>

        <div className="glass-card p-12 text-center">
          <Radio size={40} className="text-muted-foreground mx-auto mb-4" />
          <h3 className="font-heading font-semibold mb-2">No broadcasts yet</h3>
          <p className="text-sm text-muted-foreground mb-1 max-w-md mx-auto">
            Broadcast is a standalone feature for scheduling live sessions with your audience. 
            It works independently from your funnels.
          </p>
          <p className="text-xs text-muted-foreground">Coming soon — full broadcast management.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default BroadcastPage;
