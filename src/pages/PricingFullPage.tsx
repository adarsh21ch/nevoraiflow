import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { motion } from "framer-motion";

const durations = ["monthly", "6months", "yearly"] as const;
const durationLabels = { monthly: "Monthly", "6months": "6 Months", yearly: "Yearly" };

const allPlans = {
  monthly: [
    { name: "Free", price: "₹0", period: "", daily: "", key: "free", badge: null, highlight: false },
    { name: "Basic", price: "₹199", period: "/month", daily: "Just ₹7/day", key: "basic_monthly", badge: null, highlight: false },
    { name: "Pro", price: "₹499", period: "/month", daily: "Just ₹17/day", key: "pro_monthly", badge: "Most Popular", highlight: true },
  ],
  "6months": [
    { name: "Free", price: "₹0", period: "", daily: "", key: "free", badge: null, highlight: false },
    { name: "Basic", price: "₹999", period: "/6 months", daily: "Just ₹6/day", key: "basic_6months", badge: "Save ₹195", highlight: false },
    { name: "Pro", price: "₹2,499", period: "/6 months", daily: "Just ₹14/day", key: "pro_6months", badge: "Save ₹495", highlight: true },
  ],
  yearly: [
    { name: "Free", price: "₹0", period: "", daily: "", key: "free", badge: null, highlight: false },
    { name: "Basic", price: "₹1,499", period: "/year", daily: "Just ₹4/day", key: "basic_yearly", badge: "Best Value", highlight: false },
    { name: "Pro", price: "₹2,999", period: "/year", daily: "Just ₹8/day", key: "pro_yearly", badge: "Best Value", highlight: true },
  ],
};

const features = [
  { name: "Funnels", free: "2", basic: "10", pro: "Unlimited" },
  { name: "Videos", free: "5 (100MB)", basic: "20 (500MB)", pro: "Unlimited (2GB)" },
  { name: "Lead Capture", free: true, basic: true, pro: true },
  { name: "Analytics", free: "Basic", basic: "Full", pro: "Advanced" },
  { name: "WhatsApp Auto-message", free: false, basic: true, pro: true },
  { name: "Audio Notes", free: false, basic: true, pro: true },
  { name: "UPI Payment Collection", free: false, basic: true, pro: true },
  { name: "Live Broadcast", free: false, basic: false, pro: true },
  { name: "Video Sharing", free: false, basic: false, pro: true },
  { name: "Priority Support", free: false, basic: false, pro: true },
];

const PricingFullPage = () => {
  const [duration, setDuration] = useState<typeof durations[number]>("monthly");
  const plans = allPlans[duration];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container">
          <motion.div className="text-center mb-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-heading font-bold mb-4">
              Unlock the Full Power of <span className="gradient-text">Nevorai Flow</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto mb-8">Choose the plan that fits your goals. Start free, upgrade anytime.</p>

            <div className="inline-flex gap-1 p-1 bg-muted rounded-lg">
              {durations.map((d) => (
                <button key={d} onClick={() => setDuration(d)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${duration === d ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {durationLabels[d]}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
            {plans.map((plan, i) => (
              <motion.div key={plan.key} className={`glass-card p-6 relative flex flex-col ${plan.highlight ? "border-primary/40 glow-primary" : ""}`}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                {plan.badge && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full gradient-primary text-xs font-semibold text-primary-foreground">{plan.badge}</div>}
                <div className="mb-6">
                  <h3 className="text-lg font-heading font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-heading font-bold">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  {plan.daily && <p className="text-xs text-primary mt-1">{plan.daily}</p>}
                </div>
                <div className="flex-1" />
                <Link to="/auth?tab=signup">
                  <Button variant={plan.highlight ? "hero" : plan.key === "free" ? "outline" : "default"} className="w-full">
                    {plan.key === "free" ? "Start Free" : `Get ${plan.name}`}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Feature comparison */}
          <div className="glass-card overflow-hidden max-w-4xl mx-auto">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border">
                  <th className="text-left p-4 font-medium">Feature</th>
                  <th className="text-center p-4 font-medium">Free</th>
                  <th className="text-center p-4 font-medium">Basic</th>
                  <th className="text-center p-4 font-medium text-primary">Pro</th>
                </tr></thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.name} className="border-b border-border/50">
                      <td className="p-4">{f.name}</td>
                      {(["free", "basic", "pro"] as const).map((tier) => {
                        const val = f[tier];
                        return (
                          <td key={tier} className="p-4 text-center">
                            {typeof val === "boolean" ? (val ? <Check size={16} className="text-success mx-auto" /> : <X size={16} className="text-muted-foreground/40 mx-auto" />) :
                              <span className="text-muted-foreground">{val}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PricingFullPage;
