import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

const ProfilePage = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    full_name: "", phone: "", city: "", bio: "", company: "",
    instagram_url: "", whatsapp_number: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "", phone: profile.phone || "", city: profile.city || "",
        bio: profile.bio || "", company: profile.company || "",
        instagram_url: profile.instagram_url || "", whatsapp_number: profile.whatsapp_number || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setLoading(false);
    if (error) { toast.error("Failed to save"); return; }
    await refreshProfile();
    toast.success("Profile updated!");
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-heading font-bold">Profile</h1>

        <div className="glass-card p-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={28} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold">{profile?.full_name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>Company</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>WhatsApp Number</Label><Input value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} className="mt-1 bg-muted border-border" /></div>
            <div><Label>Instagram URL</Label><Input value={form.instagram_url} onChange={(e) => setForm({ ...form, instagram_url: e.target.value })} className="mt-1 bg-muted border-border" /></div>
          </div>
          <div><Label>Bio</Label><Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value.slice(0, 160) })} className="mt-1 bg-muted border-border" rows={3} maxLength={160} /><span className="text-xs text-muted-foreground">{form.bio.length}/160</span></div>

          <Button variant="hero" onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Profile"}</Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
