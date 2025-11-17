"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState, useEffect } from "react";
import { Linkedin, Brain, Database, Shield } from "lucide-react";
import Image from 'next/image';

type Integration = {
  name: string;
  type: 'icon' | 'image';
  icon?: any;
  image?: string;
  color: string;
};

const integrations: Integration[] = [
  { name: "LinkedIn", icon: Linkedin, type: 'icon', color: "#0077B5" },
  { name: "OpenAI", icon: Brain, type: 'icon', color: "#10A37F" },
  { name: "Supabase", icon: Database, type: 'icon', color: "#3ECF8E" },
  { name: "Secure", icon: Shield, type: 'icon', color: "#4CA7A1" },
];

export function IntegrationsStrip() {
  const [isHovered, setIsHovered] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const duplicatedIntegrations = isMobile 
    ? [...integrations, ...integrations]
    : [...integrations, ...integrations];

  return (
    <section id="integrations" className="py-16 bg-warm-sand overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-serif text-3xl lg:text-4xl font-normal text-ethics-black mb-4">
            Powered by Leading Technologies
          </h2>
          <p className="text-lg text-ethics-black/70">
            Built with the best tools for a seamless experience
          </p>
        </motion.div>
      </div>

      {/* Scrolling logos */}
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient overlays */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-warm-sand to-transparent z-10" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-warm-sand to-transparent z-10" />

        <motion.div
          className="flex gap-8"
          animate={{
            x: isHovered ? "-50%" : "-50%",
          }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: isMobile ? 30 : (isHovered ? 40 : 20),
              ease: "linear",
            },
          }}
          style={{
            width: "fit-content",
            willChange: "transform",
          }}
        >
          {duplicatedIntegrations.map((integration, index) => (
            <motion.div
              key={`${integration.name}-${index}`}
              className="flex-shrink-0 w-32 h-32 bg-white rounded-2xl shadow-lg flex items-center justify-center group hover:shadow-xl transition-shadow"
              whileHover={isMobile ? undefined : { scale: 1.05 }}
            >
              <div className="text-center flex flex-col items-center">
                {integration.type === 'icon' && integration.icon ? (
                  <integration.icon 
                    className="w-12 h-12 transition-transform group-hover:scale-110"
                    style={{ color: integration.color }}
                  />
                ) : integration.image ? (
                  <div className="w-12 h-12 relative transition-transform group-hover:scale-110">
                    <Image
                      src={integration.image}
                      alt={integration.name}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>
                ) : null}
                <div className="text-xs text-ethics-black/60 mt-3 px-2 truncate font-medium">
                  {integration.name}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Trust indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="max-w-7xl mx-auto px-6 mt-12"
      >
        <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-ethics-black/60">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-morality-teal" />
            <span>Secure & Private</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-dialogue-coral" />
            <span>Real-time Processing</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-reason-purple" />
            <span>AI-Powered Insights</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

