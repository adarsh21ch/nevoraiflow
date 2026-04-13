import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";
import { motion } from "framer-motion";
import { Play, Users, Eye, Target } from "lucide-react";

// Stats removed — placeholder numbers not real

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
                Smart Video Follow-Up for Entrepreneurs
              </span>
            </div>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl font-heading font-bold leading-tight tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Turn Videos Into{" "}
            <span className="gradient-text">Controlled Follow-Up Journeys.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Guide every prospect through your message step by step, keep their attention, and convert more — with a structured video flow.
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

          {/* Trust line */}
          <motion.p
            className="text-sm text-muted-foreground max-w-xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Built for creators, teams, and business owners who want more control over follow-up.
          </motion.p>
        </div>
      </div>
    </section>
  );
};
