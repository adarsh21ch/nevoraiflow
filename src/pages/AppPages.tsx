import { DashboardLayout } from "@/components/layout/DashboardLayout";

const PlaceholderPage = ({ title, description }: { title: string; description: string }) => (
  <DashboardLayout>
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-heading font-bold">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
      <div className="glass-card p-12 text-center">
        <p className="text-muted-foreground">Coming up next — this page will be built in the next iteration.</p>
      </div>
    </div>
  </DashboardLayout>
);

export const FunnelsPage = () => <PlaceholderPage title="My Funnels" description="Create, manage, and track your video funnels." />;
export const VideosPage = () => <PlaceholderPage title="Video Gallery" description="Upload and manage your videos." />;
export const LeadsPage = () => <PlaceholderPage title="All Leads" description="View and manage leads across all funnels." />;
export const PaymentsPage = () => <PlaceholderPage title="Payments" description="Track and verify all payment submissions." />;
export const AnalyticsPage = () => <PlaceholderPage title="Analytics" description="Track performance across all your funnels." />;
export const ProfilePage = () => <PlaceholderPage title="Profile" description="Manage your profile and settings." />;
export const NotificationsPage = () => <PlaceholderPage title="Notifications" description="Stay updated on your funnel activity." />;
export const SettingsPage = () => <PlaceholderPage title="Settings" description="Manage your account settings." />;
export const PricingPage = () => <PlaceholderPage title="Pricing" description="Choose the plan that's right for you." />;
