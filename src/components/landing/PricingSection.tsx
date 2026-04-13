import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const freePlan = {
  name: "Free",
  features: [
    { text: "View shared funnels", included: true },
    { text: "Access public content", included: true },
    { text: "Browse marketplace", included: true },
    { text: "Create funnels", included: false },
    { text: "Lead capture", included: false },
    { text: "Live broadcast", included: false },
  ],
  cta: "Start Free",
  variant: "outline" as const,
};

const buildFeatures = (config: any) => {
  const features: { text: string; included: boolean }[] = [];

  if (config.max_funnels === -1) features.push({ text: "Unlimited funnels", included: true });
  else if (config.max_funnels > 0) features.push({ text: `Up to ${config.max_funnels} funnels`, included: true });

  if (config.feature_landing_pages) {
    if (config.max_landing_pages === -1) features.push({ text: "Unlimited landing pages", included: true });
    else if (config.max_landing_pages > 0) features.push({ text: `Up to ${config.max_landing_pages} landing pages`, included: true });
  }

  features.push({ text: "Lead capture", included: !!config.feature_lead_capture });
  features.push({ text: "Analytics", included: !!config.feature_analytics });
  features.push({ text: "WhatsApp auto-message", included: !!config.feature_whatsapp_automation });

  if (config.feature_go_live) features.push({ text: "Live broadcast", included: true });
  else features.push({ text: "Live broadcast", included: false });

  if (config.feature_video_sharing) features.push({ text: "Video sharing", included: true });
  if (config.feature_advanced_analytics) features.push({ text: "Advanced analytics", included: true });
  if (config.feature_priority_support) features.push({ text: "Priority support", included: true });

  return features;
};

export const PricingSection = () => {
  const { data: planConfigs = [] } = useQuery({
    queryKey: ["plan-configs-landing"],
    queryFn: async () => {
      const { data } = await supabase.from("plan_config").select("*");
      return (data || []) as any[];
    },
    staleTime: 60_000,
  });

  const basicConfig = planConfigs.find((c: any) => c.plan_name === "basic");
  const proConfig = planConfigs.find((c: any) => c.plan_name === "pro");
  const basicEnabled = basicConfig?.is_enabled !== false && !!basicConfig;
  const proEnabled = proConfig?.is_enabled !== false && !!proConfig;

  const cards: {
    name: string;
    price: string;
    period: string;
    daily: string;
    badge: string | null;
    features: { text: string; included: boolean }[];
    cta: string;
    variant: "outline" | "default" | "hero";
    highlight: boolean;
  }[] = [];

  // Free card always shown
  cards.push({
    name: freePlan.name,
    price: "₹0",
    period: "",
    daily: "",
    badge: null,
    features: freePlan.features,
    cta: freePlan.cta,
    variant: freePlan.variant,
    highlight: false,
  });

  if (basicEnabled && basicConfig) {
    const price = basicConfig.monthly_price;
    const daily = price > 0 ? `Just ₹${Math.ceil(price / 30)}/day` : "";
    cards.push({
      name: "Basic",
      price: `₹${price.toLocaleString("en-IN")}`,
      period: "/month",
      daily,
      badge: basicConfig.plan_badge_text || null,
      features: buildFeatures(basicConfig),
      cta: "Get Basic",
      variant: "default",
      highlight: false,
    });
  }

  if (proEnabled && proConfig) {
    const price = proConfig.monthly_price;
    const daily = price > 0 ? `Just ₹${Math.ceil(price / 30)}/day` : "";
    cards.push({
      name: "Pro",
      price: `₹${price.toLocaleString("en-IN")}`,
      period: "/month",
      daily,
      badge: proConfig.plan_badge_text || "Most Popular",
      features: buildFeatures(proConfig),
      cta: "Go Pro",
      variant: "hero",
      highlight: true,
    });
  }

  const gridCols = cards.length === 1 ? "max-w-md mx-auto" : cards.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3 max-w-4xl mx-auto";

  return (
    <section id="pricing" className="py-24 relative">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Start free. Upgrade when you're ready to unlock the full power.
          </p>
        </motion.div>

        <div className={`grid gap-6 ${gridCols}`}>
          {cards.map((plan, i) => (
            <motion.div
              key={plan.name}
              className={`glass-card p-6 relative flex flex-col ${
                plan.highlight ? "border-primary/40 glow-primary" : ""
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground">
                  {plan.badge}
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-lg font-heading font-semibold mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-heading font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </div>
                {plan.daily && (
                  <p className="text-xs text-primary mt-1">{plan.daily}</p>
                )}
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-2 text-sm">
                    {f.included ? (
                      <Check size={16} className="text-success shrink-0" />
                    ) : (
                      <X size={16} className="text-muted-foreground/40 shrink-0" />
                    )}
                    <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>
              <Link to={plan.name === "Free" ? "/auth?tab=signup" : "/pricing"}>
                <Button variant={plan.variant} className="w-full">
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
