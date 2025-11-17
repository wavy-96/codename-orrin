"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Mic, Linkedin, BarChart3, MessageSquare, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Feature {
  id: string;
  title: string;
  description: string;
  highlights: string[];
  color: string;
}

const features: Feature[] = [
  {
    id: "voice",
    title: "Voice-Based Practice",
    description: "Practice with realistic voice conversations using OpenAI's advanced voice technology. Natural, human-like interactions that prepare you for real interviews.",
    highlights: [
      "Real-time voice conversations",
      "Natural speech recognition",
      "Human-like AI responses",
      "Practice anytime, anywhere"
    ],
    color: "dialogue-coral"
  },
  {
    id: "linkedin",
    title: "LinkedIn Integration",
    description: "Connect LinkedIn profiles to practice with interviewers that match real hiring managers. Get personalized questions based on your target role and company.",
    highlights: [
      "Emulate real interviewers",
      "Role-specific questions",
      "Company culture insights",
      "Personalized interview prep"
    ],
    color: "morality-teal"
  },
  {
    id: "analytics",
    title: "Performance Analytics",
    description: "Get detailed feedback and track your improvement over time. Understand your strengths, identify areas for growth, and see your progress.",
    highlights: [
      "Real-time feedback",
      "Performance tracking",
      "Strengths & weaknesses analysis",
      "Progress visualization"
    ],
    color: "reason-purple"
  },
  {
    id: "feedback",
    title: "AI-Powered Feedback",
    description: "Receive instant, actionable feedback on your answers. Learn how to improve your responses, structure your thoughts, and communicate more effectively.",
    highlights: [
      "Instant feedback",
      "Answer quality scoring",
      "Improvement suggestions",
      "Communication tips"
    ],
    color: "safety-gold"
  }
];

export function FeatureTabs() {
  const [activeTab, setActiveTab] = useState<string>("voice");
  const activeFeature = features.find(f => f.id === activeTab) || features[0];
  const shouldReduceMotion = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getAnimationProps = (type: 'fast' | 'normal' = 'normal') => {
    if (shouldReduceMotion || isMobile) {
      return {
        initial: { opacity: 0.8 },
        animate: { opacity: 1 },
        transition: { duration: 0.2 }
      };
    }
    return type === 'fast' 
      ? { duration: 0.3 }
      : { duration: 0.6 };
  };

  return (
    <section id="features" className="py-24 bg-light-canvas">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl lg:text-5xl font-normal text-ethics-black mb-4">
            Everything You Need to Ace Your Interview
          </h2>
          <p className="text-lg text-ethics-black/70 max-w-2xl mx-auto">
            Comprehensive tools and features designed to help you prepare, practice, and succeed.
          </p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {features.map((feature) => {
            const isActive = activeTab === feature.id;
            
            return (
              <motion.button
                key={feature.id}
                onClick={() => setActiveTab(feature.id)}
                className={cn(
                  "relative px-6 py-3 rounded-full font-medium transition-all duration-300 flex items-center gap-2",
                  isActive
                    ? "bg-ethics-black text-warm-sand shadow-lg"
                    : "bg-white text-ethics-black hover:bg-white/60"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {feature.id === "voice" && <Mic className="w-5 h-5" />}
                {feature.id === "linkedin" && <Linkedin className="w-5 h-5" />}
                {feature.id === "analytics" && <BarChart3 className="w-5 h-5" />}
                {feature.id === "feedback" && <MessageSquare className="w-5 h-5" />}
                {feature.title}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-ethics-black rounded-full -z-10"
                    transition={{ type: "spring", duration: 0.6 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="bg-white rounded-3xl p-8 lg:p-12 shadow-xl"
          >
            <div className="flex flex-col lg:grid lg:grid-cols-2 gap-12 lg:items-center">
              {/* Left - Content */}
              <div className="order-2 lg:order-1">
                <h3 className="font-serif text-3xl lg:text-4xl font-normal text-ethics-black mb-3">
                  {activeFeature.title}
                </h3>

                <p className="text-lg text-ethics-black/70 mb-6 leading-relaxed">
                  {activeFeature.description}
                </p>

                <div className="space-y-3">
                  {activeFeature.highlights.map((highlight, index) => {
                    const colorClasses = {
                      'dialogue-coral': 'bg-dialogue-coral/20 text-dialogue-coral',
                      'morality-teal': 'bg-morality-teal/20 text-morality-teal',
                      'reason-purple': 'bg-reason-purple/20 text-reason-purple',
                      'safety-gold': 'bg-safety-gold/20 text-safety-gold',
                    };
                    const colorClass = colorClasses[activeFeature.color as keyof typeof colorClasses] || colorClasses['dialogue-coral'];
                    
                    return (
                      <motion.div
                        key={highlight}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3"
                      >
                        <div className={cn(
                          "mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                          colorClass.split(' ')[0]
                        )}>
                          <Check className={cn("w-3 h-3", colorClass.split(' ')[1])} />
                        </div>
                        <span className="text-ethics-black/80">{highlight}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Right - Visual */}
              <div className="relative order-1 lg:order-2">
                {(() => {
                  const gradientClasses = {
                    'dialogue-coral': 'bg-gradient-to-br from-dialogue-coral/20 to-dialogue-coral/5',
                    'morality-teal': 'bg-gradient-to-br from-morality-teal/20 to-morality-teal/5',
                    'reason-purple': 'bg-gradient-to-br from-reason-purple/20 to-reason-purple/5',
                    'safety-gold': 'bg-gradient-to-br from-safety-gold/20 to-safety-gold/5',
                  };
                  const gradientClass = gradientClasses[activeFeature.color as keyof typeof gradientClasses] || gradientClasses['dialogue-coral'];
                  
                  return (
                    <div className={cn(
                      "aspect-square rounded-2xl p-4 sm:p-6 lg:p-8 flex items-center justify-center",
                      gradientClass
                    )}>
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                    {activeTab === "voice" && (
                      <motion.div
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[280px] sm:max-w-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="bg-gradient-to-r from-dialogue-coral to-dialogue-coral/80 px-6 py-4">
                          <div className="text-white text-center">
                            <Mic className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-sm font-medium">Voice Interview</div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center justify-center gap-2 mb-4">
                            {[...Array(5)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1 bg-dialogue-coral rounded-full"
                                animate={{
                                  height: [20, 40, 20],
                                }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  delay: i * 0.1,
                                }}
                              />
                            ))}
                          </div>
                          <p className="text-sm text-center text-ethics-black/70">
                            Real-time voice conversation
                          </p>
                        </div>
                      </motion.div>
                    )}
                    
                    {activeTab === "linkedin" && (
                      <motion.div
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[280px] sm:max-w-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="bg-gradient-to-r from-morality-teal to-morality-teal/80 px-6 py-4">
                          <div className="text-white text-center">
                            <Linkedin className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-sm font-medium">LinkedIn Profile</div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-morality-teal/20 flex items-center justify-center">
                              <Linkedin className="w-6 h-6 text-morality-teal" />
                            </div>
                            <div>
                              <div className="font-semibold text-ethics-black">John Doe</div>
                              <div className="text-xs text-ethics-black/60">Senior Engineer at Tech Corp</div>
                            </div>
                          </div>
                          <p className="text-sm text-ethics-black/70">
                            Practice with interviewer profiles
                          </p>
                        </div>
                      </motion.div>
                    )}
                    
                    {activeTab === "analytics" && (
                      <motion.div
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[280px] sm:max-w-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="bg-gradient-to-r from-reason-purple to-reason-purple/80 px-6 py-4">
                          <div className="text-white text-center">
                            <BarChart3 className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-sm font-medium">Analytics Dashboard</div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            {[
                              { label: "Score", value: "85%" },
                              { label: "Clarity", value: "90%" },
                            ].map((stat, i) => (
                              <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                                <div className="text-lg font-bold text-reason-purple">{stat.value}</div>
                                <div className="text-xs text-ethics-black/60">{stat.label}</div>
                              </div>
                            ))}
                          </div>
                          <p className="text-sm text-ethics-black/70">
                            Track your performance over time
                          </p>
                        </div>
                      </motion.div>
                    )}
                    
                    {activeTab === "feedback" && (
                      <motion.div
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden w-full max-w-[280px] sm:max-w-sm"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="bg-gradient-to-r from-safety-gold to-safety-gold/80 px-6 py-4">
                          <div className="text-white text-center">
                            <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                            <div className="text-sm font-medium">AI Feedback</div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="bg-safety-gold/10 rounded-lg p-4 mb-4">
                            <p className="text-sm text-ethics-black/80">
                              "Great answer! Consider adding more specific examples to strengthen your response."
                            </p>
                          </div>
                          <p className="text-sm text-ethics-black/70">
                            Instant, actionable feedback
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

