"use client";

import { motion } from "framer-motion";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { Sparkles } from "lucide-react";

/**
 * CloudLandingScene
 * Cinematic entry — animated cloud layers descend to reveal a CTA.
 * Uses warm-toned radial gradient clouds for visible contrast against cream bg.
 */
export default function CloudLandingScene() {
  const { setFlowStep } = useOnboardingStore();

  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-b from-[#fdf7ee] via-[#fff5e6] to-[#ffecd2]">
      {/* Animated cloud layers — warm gradients for visibility */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Layer 1: Large background clouds — slow drift */}
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 600,
            height: 240,
            background:
              "radial-gradient(ellipse, rgba(255,225,180,0.6) 0%, rgba(255,240,220,0.2) 60%, transparent 100%)",
            top: "5%",
            left: "-5%",
            willChange: "transform",
          }}
          animate={{ x: [0, 90, 0], y: [0, -12, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full blur-3xl"
          style={{
            width: 700,
            height: 260,
            background:
              "radial-gradient(ellipse, rgba(255,220,170,0.5) 0%, rgba(255,235,210,0.15) 60%, transparent 100%)",
            top: "2%",
            right: "-8%",
            willChange: "transform",
          }}
          animate={{ x: [0, -70, 0], y: [0, 18, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Layer 2: Mid-level clouds */}
        <motion.div
          className="absolute rounded-full blur-2xl"
          style={{
            width: 450,
            height: 180,
            background:
              "radial-gradient(ellipse, rgba(255,215,160,0.6) 0%, rgba(255,230,200,0.2) 55%, transparent 100%)",
            top: "20%",
            left: "12%",
            willChange: "transform",
          }}
          animate={{ x: [0, 50, 0], y: [0, -8, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full blur-2xl"
          style={{
            width: 380,
            height: 150,
            background:
              "radial-gradient(ellipse, rgba(255,210,155,0.55) 0%, rgba(255,225,190,0.15) 55%, transparent 100%)",
            top: "30%",
            right: "8%",
            willChange: "transform",
          }}
          animate={{ x: [0, -50, 0], y: [0, 10, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Layer 3: Foreground wisps — faster */}
        <motion.div
          className="absolute rounded-full blur-xl"
          style={{
            width: 300,
            height: 120,
            background:
              "radial-gradient(ellipse, rgba(255,205,150,0.5) 0%, transparent 55%)",
            bottom: "28%",
            left: "3%",
            willChange: "transform",
          }}
          animate={{ x: [0, 75, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full blur-xl"
          style={{
            width: 350,
            height: 140,
            background:
              "radial-gradient(ellipse, rgba(255,195,130,0.45) 0%, transparent 55%)",
            bottom: "20%",
            right: "-2%",
            willChange: "transform",
          }}
          animate={{ x: [0, -50, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Ground mist */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(255,236,210,0.9), transparent)",
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
        >
          {/* Brand mark */}
          <motion.div
            className="mx-auto mb-6 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg"
            style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5, type: "spring", stiffness: 200 }}
          >
            <Sparkles className="text-white" size={28} />
          </motion.div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-800 tracking-tight leading-tight">
            <span className="block">Where can your</span>
            <span className="bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
              budget
            </span>{" "}
            <span>take you?</span>
          </h1>

          <motion.p
            className="mt-4 text-gray-500 text-base md:text-lg max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            Explore incredible destinations within your budget.
            Spatially. Intelligently.
          </motion.p>
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={() => setFlowStep("budget")}
          className="mt-8 group relative px-8 py-3.5 rounded-full text-white font-semibold text-base shadow-lg active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #d97706)",
            boxShadow: "0 8px 30px rgba(245,158,11,0.3)",
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.6, type: "spring" }}
          whileHover={{ scale: 1.04, boxShadow: "0 12px 40px rgba(245,158,11,0.4)" }}
          whileTap={{ scale: 0.97 }}
        >
          Start Exploring
          <span className="inline-block ml-2 group-hover:translate-x-0.5 transition-transform">→</span>
        </motion.button>

        {/* Subtle hint */}
        <motion.p
          className="mt-6 text-xs text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
        >
          Powered by Velosta AI
        </motion.p>
      </div>
    </div>
  );
}
