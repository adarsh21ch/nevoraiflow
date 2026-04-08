import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PrivateLeadFormProps {
  funnelId: string;
  funnelTitle: string;
  requiredFields: { email: boolean; city: boolean; state: boolean; whatsapp: boolean };
  onSuccess: () => void;
  isDark: boolean;
}

export const PrivateLeadForm = ({
  funnelId,
  funnelTitle,
  requiredFields,
  onSuccess,
  isDark,
}: PrivateLeadFormProps) => {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", city: "", state: "", whatsapp: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    if (form.phone.replace(/\D/g, "").length < 10) {
      toast.error("Please enter a valid phone number");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("funnel_leads").insert({
        funnel_id: funnelId,
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        city: form.city || null,
        custom_value: JSON.stringify({ state: form.state, whatsapp: form.whatsapp }),
        device_type: /Mobi/.test(navigator.userAgent) ? "mobile" : "desktop",
        user_agent: navigator.userAgent,
        status: "new",
      });

      if (error) throw error;

      // Store lead info in localStorage for session persistence
      localStorage.setItem(
        `nf_lead_${funnelId}`,
        JSON.stringify({ name: form.name, phone: form.phone, submittedAt: Date.now() })
      );

      toast.success("Welcome! You now have access.");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const cardBg = isDark ? "#141419" : "#f8f9fa";
  const border = isDark ? "#27272a" : "#e5e7eb";
  const text = isDark ? "#ffffff" : "#0f172a";
  const textMuted = isDark ? "#94a3b8" : "#64748b";
  const inputBg = isDark ? "#09090b" : "#f1f5f9";

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-2xl p-6" style={{ background: cardBg, border: `1px solid ${border}` }}>
        <h3 className="text-lg font-heading font-bold mb-1" style={{ color: text }}>{funnelTitle}</h3>
        <p className="text-sm mb-5" style={{ color: textMuted }}>Fill in your details to get access</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-xs" style={{ color: textMuted }}>Full Name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your full name"
              required
              className="mt-1 h-11"
              style={{ background: inputBg, borderColor: border, color: text }}
            />
          </div>

          <div>
            <Label className="text-xs" style={{ color: textMuted }}>Phone Number *</Label>
            <div className="flex gap-2 mt-1">
              <div className="flex items-center px-3 rounded-md text-sm shrink-0 h-11" style={{ background: inputBg, border: `1px solid ${border}`, color: textMuted }}>+91</div>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="9876543210"
                required
                className="h-11"
                style={{ background: inputBg, borderColor: border, color: text }}
              />
            </div>
          </div>

          {requiredFields.email && (
            <div>
              <Label className="text-xs" style={{ color: textMuted }}>Email Address</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your@email.com"
                className="mt-1 h-11"
                style={{ background: inputBg, borderColor: border, color: text }}
              />
            </div>
          )}

          {requiredFields.city && (
            <div>
              <Label className="text-xs" style={{ color: textMuted }}>City</Label>
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Your city"
                className="mt-1 h-11"
                style={{ background: inputBg, borderColor: border, color: text }}
              />
            </div>
          )}

          {requiredFields.state && (
            <div>
              <Label className="text-xs" style={{ color: textMuted }}>State</Label>
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Your state"
                className="mt-1 h-11"
                style={{ background: inputBg, borderColor: border, color: text }}
              />
            </div>
          )}

          {requiredFields.whatsapp && (
            <div>
              <Label className="text-xs" style={{ color: textMuted }}>WhatsApp Number</Label>
              <Input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                placeholder="WhatsApp number"
                className="mt-1 h-11"
                style={{ background: inputBg, borderColor: border, color: text }}
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl mt-2"
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="animate-spin mr-2" /> Registering...</> : "Get Access →"}
          </Button>
        </form>
      </div>
    </div>
  );
};
