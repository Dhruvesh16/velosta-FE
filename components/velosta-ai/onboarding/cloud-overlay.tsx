"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Compass } from "lucide-react";

/**
 * CloudOverlay — reusable animated cloud component.
 *
 * mode: "landing"  → full CTA landing screen
 *       "loading"  → translucent overlay with loading message
 *       "crafting" → hero overlay used while AI crafts the itinerary,
 *                    with rotating sublines and a deeper cinematic feel.
 */
interface CloudOverlayProps {
  visible: boolean;
  mode?: "landing" | "loading" | "crafting";
  message?: string;
  /** Optional rotating sublines (used in `crafting` mode) */
  sublines?: string[];
}

/** Individual cloud element with radial gradient for visible contrast */
function Cloud({
  width,
  height,
  color,
  top,
  left,
  right,
  bottom,
  driftX,
  driftY = [0, 0, 0],
  duration,
  blur,
}: {
  width: number;
  height: number;
  color: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  driftX: number[];
  driftY?: number[];
  duration: number;
  blur: string;
}) {
  return (
    <motion.div
      className={`absolute rounded-full ${blur}`}
      style={{
        width,
        height,
        background: color,
        top,
        left,
        right,
        bottom,
        willChange: "transform",
      }}
      animate={{ x: driftX, y: driftY }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function CloudLayers() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ── Layer 1: Large background clouds — slow drift ────────────── */}
      <Cloud
        width={600} height={240}
        color="radial-gradient(ellipse, rgba(255,225,180,0.55) 0%, rgba(255,240,220,0.2) 60%, transparent 100%)"
        top="2%" left="-8%"
        driftX={[0, 100, 0]} driftY={[0, -10, 0]}
        duration={22} blur="blur-3xl"
      />
      <Cloud
        width={700} height={280}
        color="radial-gradient(ellipse, rgba(255,220,170,0.5) 0%, rgba(255,235,210,0.15) 60%, transparent 100%)"
        top="0%" right="-10%"
        driftX={[0, -80, 0]} driftY={[0, 15, 0]}
        duration={26} blur="blur-3xl"
      />

      {/* ── Layer 2: Mid-level clouds — moderate drift ───────────────── */}
      <Cloud
        width={450} height={180}
        color="radial-gradient(ellipse, rgba(255,215,160,0.6) 0%, rgba(255,230,200,0.2) 55%, transparent 100%)"
        top="18%" left="10%"
        driftX={[0, 60, 0]} driftY={[0, -8, 0]}
        duration={18} blur="blur-2xl"
      />
      <Cloud
        width={400} height={160}
        color="radial-gradient(ellipse, rgba(255,210,155,0.55) 0%, rgba(255,225,190,0.15) 55%, transparent 100%)"
        top="28%" right="5%"
        driftX={[0, -55, 0]} driftY={[0, 12, 0]}
        duration={20} blur="blur-2xl"
      />
      <Cloud
        width={350} height={140}
        color="radial-gradient(ellipse, rgba(255,200,140,0.5) 0%, transparent 60%)"
        top="40%" left="25%"
        driftX={[0, 45, 0]}
        duration={17} blur="blur-2xl"
      />

      {/* ── Layer 3: Foreground wisps — faster drift ─────────────────── */}
      <Cloud
        width={320} height={130}
        color="radial-gradient(ellipse, rgba(255,205,150,0.5) 0%, transparent 55%)"
        bottom="30%" left="0%"
        driftX={[0, 80, 0]}
        duration={13} blur="blur-xl"
      />
      <Cloud
        width={380} height={150}
        color="radial-gradient(ellipse, rgba(255,195,130,0.45) 0%, transparent 55%)"
        bottom="22%" right="-5%"
        driftX={[0, -60, 0]} driftY={[0, 8, 0]}
        duration={15} blur="blur-xl"
      />
      <Cloud
        width={250} height={100}
        color="radial-gradient(ellipse, rgba(255,210,160,0.4) 0%, transparent 55%)"
        bottom="45%" left="40%"
        driftX={[0, 50, 0]}
        duration={12} blur="blur-xl"
      />
    </div>
  );
}

export default function CloudOverlay({
  visible,
  mode = "loading",
  message = "Discovering amazing places...",
  sublines,
}: CloudOverlayProps) {
  // Rotate sublines every 2.4s (only in crafting mode)
  const [sublineIdx, setSublineIdx] = useState(0);
  useEffect(() => {
    if (!visible || mode !== "crafting" || !sublines || sublines.length === 0) return;
    const t = setInterval(() => {
      setSublineIdx((i) => (i + 1) % sublines.length);
    }, 2400);
    return () => clearInterval(t);
  }, [visible, mode, sublines]);

  const isHero = mode === "landing" || mode === "crafting";
  void isHero; // reserved for future hero-specific tweaks

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 overflow-hidden"
          style={{
            zIndex: 9999, // above everything including Mapbox canvas
            background:
              mode === "landing"
                ? "linear-gradient(to bottom, #fdf7ee, #fff5e6, #ffecd2)"
                : mode === "crafting"
                ? "linear-gradient(180deg, #FFF6E9 0%, #FFE9CD 55%, #FFD9A8 100%)"
                : "rgba(253,247,238,0.96)",
            backdropFilter: mode === "loading" ? "blur(8px)" : undefined,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          <CloudLayers />

          {/* Ground mist gradient */}
          <div
            className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none"
            style={{
              background:
                "linear-gradient(to top, rgba(255,236,210,0.9), transparent)",
            }}
          />

          {/* Loading content */}
          {mode === "loading" && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full">
              <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-6"
                style={{
                  background: "linear-gradient(135deg, #d97757, #d97757)",
                }}
                animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles className="text-white" size={28} />
              </motion.div>

              <motion.p
                className="text-gray-700 font-semibold text-base mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {message}
              </motion.p>

              {/* Animated dots */}
              <div className="flex gap-1.5 mt-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#E89378]"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Crafting content — hero, cinematic */}
          {mode === "crafting" && (
            <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
              {/* Floating compass + orbiting sparkle */}
              <div className="relative mb-10">
                <motion.div
                  className="w-24 h-24 rounded-full flex items-center justify-center shadow-2xl"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, #FFFFFF, #FFE0B0 60%, #D97757 100%)",
                    boxShadow:
                      "0 30px 80px rgba(217,119,87,0.35), inset 0 -10px 30px rgba(184,95,68,0.25)",
                  }}
                  animate={{ y: [0, -10, 0], rotate: [0, 360] }}
                  transition={{
                    y: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 18, repeat: Infinity, ease: "linear" },
                  }}
                >
                  <Compass className="text-white drop-shadow" size={42} strokeWidth={1.6} />
                </motion.div>

                {/* Orbiting sparkles */}
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute top-1/2 left-1/2 w-3 h-3 -ml-1.5 -mt-1.5"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 6 + i * 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    style={{ transformOrigin: "50% 50%" }}
                  >
                    <div
                      className="absolute"
                      style={{
                        top: -60 - i * 10,
                        left: 0,
                      }}
                    >
                      <Sparkles size={12 - i * 2} className="text-[#B85F44]" />
                    </div>
                  </motion.div>
                ))}

                {/* Soft pulse halo */}
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(217,119,87,0.25) 0%, transparent 70%)",
                  }}
                  animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
                />
              </div>

              {/* Headline */}
              <motion.h2
                className="text-2xl md:text-3xl font-bold tracking-tight"
                style={{
                  background:
                    "linear-gradient(120deg, #6B3A22, #B85F44 60%, #D97757)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                {message}
              </motion.h2>

              {/* Rotating subline */}
              <div className="h-7 mt-4">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={sublines?.[sublineIdx] ?? ""}
                    className="text-sm md:text-base text-[#6B3A22]/75"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.45 }}
                  >
                    {sublines?.[sublineIdx] ?? "Velosta AI is on it\u2026"}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress shimmer bar */}
              <div className="mt-8 w-56 h-1 rounded-full bg-[#6B3A22]/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #D97757, transparent)",
                  }}
                  animate={{ x: ["-40%", "140%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <motion.p
                className="text-[11px] uppercase tracking-[0.18em] text-[#B85F44]/70 mt-6"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Please don’t close this tab
              </motion.p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
