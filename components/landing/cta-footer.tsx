"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface CTAFooterProps {
  onGetStartedClick: () => void;
}

export function CTAFooter({ onGetStartedClick }: CTAFooterProps) {
  return (
    <section className="py-24 bg-light-canvas relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 opacity-30">
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-dialogue-coral/20 rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-morality-teal/20 rounded-full blur-3xl"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-serif text-4xl lg:text-6xl font-normal text-ethics-black mb-6">
            Ready to Ace Your Next Interview?
          </h2>
          <p className="text-xl text-ethics-black/70 mb-12 leading-relaxed">
            Join thousands of job seekers who are practicing with AI interviewers 
            and landing their dream jobs. Start your free practice session today.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="primary"
              onClick={onGetStartedClick}
              className="bg-dialogue-coral hover:bg-dialogue-coral/90 text-white font-semibold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Link href="/login">
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-4 rounded-full"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

