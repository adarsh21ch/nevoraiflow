import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { motion } from "framer-motion";
import { Play, Users, Eye, Target } from "lucide-react";

const stats = [
  { icon: Eye, label: "Video Plays", value: "51,000+" },
  { icon: Users, label: "Monthly Users", value: "26,000+" },
  { icon: Target, label: "Leads Captured", value: "10,000+" },
];

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="absolute inset-0 animate-grid opacity-50" />

      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />

      <div className="container relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs text-muted-foreground font-medium">
                Smart Video Funnels for Entrepreneurs
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold leading-tight tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Turn Random Videos Into{" "}
            <span className="gradient-text">Structured Funnels.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Build smart video funnels that capture leads, structure your content, and guide your audience step by step.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link to="/auth?tab=signup">
              <Button variant="hero" size="xl">
                Start Free
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="hero-outline" size="xl">
                <Play size={18} />
                See How It Works
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-6 md:gap-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            {stats.map((stat) => (
              <div key={stat.label} className="glass-card px-6 py-4 flex items-center gap-3">
                <stat.icon size={20} className="text-primary" />
                <div className="text-left">
                  <div className="text-lg font-heading font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
