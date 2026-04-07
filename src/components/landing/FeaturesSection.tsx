import { motion } from "framer-motion";
import { Video, ClipboardList, MessageCircle, Route, BarChart3, Radio } from "lucide-react";

const features = [
  {
    icon: Video,
    title: "Video Funnels",
    description: "Controlled playback, timed CTAs, and video access limits — your video, your rules.",
  },
  {
    icon: ClipboardList,
    title: "Lead Capture",
    description: "Capture name, phone, email, and city. Show the form before, during, or after your video.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Auto-message",
    description: "Instantly message new leads on WhatsApp. Follow up before they forget your name.",
  },
  {
    icon: Route,
    title: "Step-by-Step Journeys",
    description: "Turn a normal video into a guided funnel experience with unlock rules, next steps, and structured progression.",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track video plays, watch time, lead conversions, and drop-off points — all in real-time.",
  },
  {
    icon: Radio,
    title: "Live Sessions",
    description: "Schedule live sessions, collect registrations with countdown pages, and share meeting links with your audience.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 relative">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="container relative z-10">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Everything You Need to <span className="gradient-text">Grow</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Purpose-built tools for entrepreneurs who want to scale their business online.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              className="glass-card-hover p-6 group cursor-default"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <f.icon className="text-primary" size={22} />
              </div>
              <h3 className="text-base font-heading font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
