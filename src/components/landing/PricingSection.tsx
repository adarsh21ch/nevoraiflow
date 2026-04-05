import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    daily: "",
    badge: null,
    features: [
      { text: "2 funnels", included: true },
      { text: "5 videos (100MB each)", included: true },
      { text: "Basic lead capture", included: true },
      { text: "Basic analytics", included: true },
      { text: "WhatsApp auto-message", included: false },
      { text: "Live broadcast", included: false },
    ],
    cta: "Start Free",
    variant: "outline" as const,
    highlight: false,
  },
  {
    name: "Basic",
    price: "₹199",
    period: "/month",
    daily: "Just ₹7/day",
    badge: null,
    features: [
      { text: "10 funnels", included: true },
      { text: "20 videos (500MB each)", included: true },
      { text: "Full lead capture", included: true },
      { text: "Full analytics", included: true },
      { text: "WhatsApp auto-message", included: true },
      { text: "Live broadcast", included: false },
    ],
    cta: "Get Basic",
    variant: "default" as const,
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹499",
    period: "/month",
    daily: "Just ₹17/day",
    badge: "Most Popular",
    features: [
      { text: "Unlimited funnels", included: true },
      { text: "Unlimited videos (2GB each)", included: true },
      { text: "Full lead capture", included: true },
      { text: "Advanced analytics", included: true },
      { text: "WhatsApp auto-message", included: true },
      { text: "Live broadcast", included: true },
    ],
    cta: "Go Pro",
    variant: "hero" as const,
    highlight: true,
  },
];

export const PricingSection = () => {
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

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
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
              <Link to="/auth?tab=signup">
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
