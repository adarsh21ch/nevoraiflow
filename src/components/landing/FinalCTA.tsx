import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const FinalCTA = () => {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 gradient-bg-subtle" />
      <div className="container relative z-10">
        <motion.div
          className="text-center max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Ready to Control Your <span className="gradient-text">Follow-Up?</span>
          </h2>
          <p className="text-muted-foreground mb-8 text-base md:text-lg leading-relaxed">
            Stop sending random video links. Start sending structured journeys that improve attention and conversion.
          </p>
          <Link to="/auth?tab=signup">
            <Button variant="hero" size="xl">
              Start Free
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
