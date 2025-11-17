"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Mic, ArrowRight, TrendingUp, Users, Award } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  
  const roles = ['Software Engineer', 'Product Manager', 'Data Scientist', 'Designer', 'Marketing Manager'];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRoleIndex((prev) => (prev + 1) % roles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [roles.length]);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-warm-sand via-light-canvas to-warm-sand">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 w-96 h-96 bg-dialogue-coral/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 w-96 h-96 bg-morality-teal/10 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-24 lg:pt-40 lg:pb-32">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:items-center">
          {/* Left side - Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="order-1 lg:order-1"
          >
            <h1 className="font-serif text-4xl lg:text-6xl font-normal text-ethics-black mb-6 leading-tight">
              Master Your Next Interview with{' '}
              <motion.span
                key={currentRoleIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="inline-block text-dialogue-coral"
              >
                {roles[currentRoleIndex]}
              </motion.span>
              {' '}Interviewers
            </h1>

            <p className="text-lg lg:text-xl text-ethics-black/70 mb-8 lg:mb-8 leading-relaxed">
              Practice with AI-powered interviewers that emulate real hiring managers. 
              Get personalized feedback, improve your answers, and land your dream job.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-dialogue-coral hover:bg-dialogue-coral/90 text-white font-semibold px-8 py-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  Start Practicing
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="px-8 py-4 rounded-full"
                >
                  Sign In
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="grid grid-cols-3 gap-8 pt-12 border-t border-ethics-black/10"
            >
              <div>
                <div className="text-3xl font-bold text-dialogue-coral">10K+</div>
                <div className="text-sm text-ethics-black/60 mt-1">Interviews Practiced</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-morality-teal">95%</div>
                <div className="text-sm text-ethics-black/60 mt-1">Success Rate</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-reason-purple">24/7</div>
                <div className="text-sm text-ethics-black/60 mt-1">Available</div>
              </div>
            </motion.div>
          </motion.div>

          {/* Right side - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative order-2 lg:order-2"
          >
            <div className="aspect-square rounded-3xl relative bg-gradient-to-br from-warm-sand/50 to-light-canvas/50 backdrop-blur-sm border border-ethics-black/10 overflow-hidden">
              {/* Interview Interface Mockup */}
              <div className="p-8 h-full flex flex-col">
                {/* Header */}
                <div className="bg-white/80 backdrop-blur-sm border-b border-ethics-black/10 px-4 py-3 rounded-t-2xl flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-dialogue-coral to-morality-teal flex items-center justify-center">
                    <Mic className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-ethics-black text-sm">AI Interviewer</div>
                    <div className="text-xs text-ethics-black/60">Active Session</div>
                  </div>
                </div>

                {/* Conversation Bubbles */}
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {[
                    {
                      text: "Tell me about yourself and why you're interested in this role.",
                      isUser: false,
                      delay: 0,
                    },
                    {
                      text: "I'm a software engineer with 5 years of experience building scalable web applications...",
                      isUser: true,
                      delay: 1,
                    },
                    {
                      text: "That's great! Can you walk me through a challenging project you've worked on?",
                      isUser: false,
                      delay: 2,
                    },
                  ].map((message, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: message.delay, duration: 0.5 }}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                          message.isUser
                            ? 'bg-dialogue-coral/20 text-ethics-black rounded-tr-sm'
                            : 'bg-white/95 text-ethics-black rounded-tl-sm border border-ethics-black/10'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Feedback Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 3, duration: 0.5 }}
                  className="mt-4 bg-morality-teal/10 border border-morality-teal/20 rounded-xl p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-morality-teal" />
                    <span className="text-sm font-semibold text-ethics-black">Real-time Feedback</span>
                  </div>
                  <p className="text-xs text-ethics-black/70">
                    Your answer demonstrates strong technical skills. Consider adding more context about impact.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

