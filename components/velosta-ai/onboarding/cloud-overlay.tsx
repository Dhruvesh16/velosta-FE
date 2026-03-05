"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * CloudOverlay — reusable animated cloud component.
 *
 * mode: "landing" → full CTA landing screen
 *       "loading" → translucent overlay with loading message
 *
 * FIXES APPLIED:
 * - Clouds now use radial gradients with warm tones (not plain white) for
 *   contrast against the cream background.
 * - z-index set to 9999 to ensure it layers above Mapbox canvas.
 * - will-change: transform for GPU acceleration.
 * - Multiple cloud sizes and drift speeds for depth.
 */
interface CloudOverlayProps {
  visible: boolean;
  mode?: "landing" | "loading";
  message?: string;
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
}: CloudOverlayProps) {
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
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                }}
                animate={{ y: [0, -8, 0], rotate: [0, 3, -3, 0] }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
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
                    className="w-2 h-2 rounded-full bg-amber-400"
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
