import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is Nevorai Flow?",
    a: "Nevorai Flow is a video funnel platform built specifically for network marketers and direct sellers. Upload a video, share a link, and automatically capture leads, collect payments, and grow your team.",
  },
  {
    q: "Do I need any technical skills?",
    a: "Not at all! Nevorai Flow is designed for non-technical users. Just upload your video, configure your funnel in a few clicks, and share the link. It's that simple.",
  },
  {
    q: "How do payments work?",
    a: "Your prospects pay via UPI directly to your account. They upload a screenshot as proof, and you verify it from your dashboard. No middleman, no commissions.",
  },
  {
    q: "Can I use this on my phone?",
    a: "Yes! Nevorai Flow is fully mobile-optimized. Both you and your prospects can use it perfectly on any smartphone.",
  },
  {
    q: "Is there a free plan?",
    a: "Yes! You can start with our free plan — 2 funnels, 5 videos, and basic lead capture. Upgrade anytime when you're ready for more.",
  },
  {
    q: "What network marketing companies does this work with?",
    a: "Nevorai Flow works with every network marketing company — Forever Living, Amway, Herbalife, Modicare, Vestige, Mi Lifestyle, and any other company you're with.",
  },
  {
    q: "Can my team use this too?",
    a: "Absolutely! Each team member creates their own account and funnels. On Pro plan, you can even share videos with your team members.",
  },
  {
    q: "What if I need help?",
    a: "We offer priority WhatsApp support for all paid plans. Free users can reach us via email. We're here to help you succeed.",
  },
];

export const FAQSection = () => {
  return (
    <section id="faq" className="py-24">
      <div className="container max-w-3xl">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass-card px-6 border-white/[0.06]"
              >
                <AccordionTrigger className="text-sm font-medium text-foreground hover:no-underline py-4">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
