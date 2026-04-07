import { motion } from "framer-motion";
import {
  ShieldOff,
  SlidersHorizontal,
  BarChart3,
  UserPlus,
  Route,
  Zap,
} from "lucide-react";

const benefits = [
  {
    icon: ShieldOff,
    title: "Distraction-Free Viewing",
    problem: "YouTube, Drive & WhatsApp flood viewers with suggested videos, comments, and competing content.",
    solution: "Clean, branded experience — no recommendations, no noise, no distractions. Your viewer stays focused on your message.",
  },
  {
    icon: SlidersHorizontal,
    title: "Controlled Watch Experience",
    problem: "Viewers skip ahead, miss key points, and never follow the sequence you intended.",
    solution: "Control seeking, enforce watch order, and ensure viewers complete important content before moving forward.",
  },
  {
    icon: BarChart3,
    title: "Viewer Progress Tracking",
    problem: "With YouTube or WhatsApp, you have zero idea who watched, how much, or where they dropped off.",
    solution: "Track who watched, how far they got, and where they dropped off — so you can follow up with confidence.",
  },
  {
    icon: UserPlus,
    title: "Built-In Lead Capture",
    problem: "Sharing video links gives you views, but zero prospect data — no names, no numbers, no follow-ups.",
    solution: "Capture name, phone, email, and city directly — turning every viewer into a trackable, contactable lead.",
  },
  {
    icon: Route,
    title: "Videos Become Journeys",
    problem: "A normal video is just content. It has no structure, no next step, and no conversion path.",
    solution: "Convert videos into guided step-by-step funnels that unlock actions, next steps, and conversions intentionally.",
  },
  {
    icon: Zap,
    title: "Built for Conversion",
    problem: "Platforms give you views and vanity metrics — not business results or structured follow-up.",
    solution: "Drive action: capture leads, guide decisions, collect payments, and create conversion-ready journeys.",
  },
];

export const WhyNevorai = () => {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 gradient-bg-subtle" />

      <div className="container relative z-10">
        <motion.div
          className="text-center mb-6"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-destructive/20 bg-destructive/5 mb-6">
            <span className="text-xs font-medium text-destructive">
              Stop sending random video links
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Why Not Just Use YouTube or{" "}
            <span className="gradient-text">WhatsApp?</span>
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg leading-relaxed">
            Because random video sharing creates random results.
            <br className="hidden sm:block" />
            <span className="text-foreground font-medium">
              Nevorai Flow gives you structure, control, and conversion.
            </span>
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto mt-14">
          {benefits.map((b, i) => (
            <motion.div
              key={b.title}
              className="glass-card-hover p-6 group cursor-default flex flex-col"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors shrink-0">
                <b.icon className="text-primary" size={20} />
              </div>
              <h3 className="text-sm font-heading font-semibold mb-3">
                {b.title}
              </h3>
              <p className="text-xs text-destructive/70 leading-relaxed mb-2">
                <span className="font-medium text-destructive">Problem:</span>{" "}
                {b.problem}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed mt-auto">
                <span className="font-medium text-success">With Nevorai:</span>{" "}
                {b.solution}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom reinforcement */}
        <motion.div
          className="text-center mt-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-lg md:text-xl font-heading font-semibold text-foreground">
            Turn Random Videos Into{" "}
            <span className="gradient-text">Structured Funnels.</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            No distractions. No guesswork. Just results.
          </p>
        </motion.div>
      </div>
    </section>
  );
};
