"use client";

/**
 * FlowChrome — persistent orchestrator layer for the Velosta AI planning flow.
 *
 * Renders above every step and ties the experience together:
 *   • Brand mark (top-left)
 *   • Minimalist step rail (bottom-center) with labels + progress
 *   • Ambient atmospheric canvas (subtle radial washes)
 *
 * Pure presentation. Does not touch stores — receives current step via prop.
 */

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Playfair_Display } from "next/font/google";

const playfair = Playfair_Display({ subsets: ["latin"], weight: ["500", "600"] });

const C = {
  navy: "#0B1F2A",
  teal: "#2F6F73",
};

export type FlowStep =
  | "landing"
  | "budget"
  | "packages"
  | "trip-inputs"
  | "explore"
  | "planner";

type Props = {
  currentStep: FlowStep;
  onExit?: () => void;
};

export default function FlowChrome({ currentStep: _currentStep, onExit }: Props) {
  const reduced = useReducedMotion();

  return (
    <>
      {/* Ambient atmosphere — fixed, behind all content */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ mixBlendMode: "multiply" }}
      >
        <motion.div
          animate={
            reduced
              ? {}
              : { opacity: [0.55, 0.75, 0.55] }
          }
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -left-40 top-10 h-[640px] w-[640px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(47,111,115,0.12) 0%, rgba(47,111,115,0) 65%)",
            filter: "blur(60px)",
          }}
        />
        <motion.div
          animate={
            reduced
              ? {}
              : { opacity: [0.6, 0.85, 0.6] }
          }
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -right-40 bottom-20 h-[560px] w-[560px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(245,239,230,0.6) 0%, rgba(245,239,230,0) 70%)",
            filter: "blur(50px)",
          }}
        />
      </div>

      {/* Brand mark — top-left. Hidden on mobile (each page owns its own header on small screens) */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
        className="pointer-events-auto fixed left-6 top-6 z-50 hidden md:block sm:left-10 sm:top-8"
      >
        <Link
          href="/"
          className="group inline-flex items-center gap-3"
          onClick={(e) => {
            if (onExit) {
              e.preventDefault();
              onExit();
            }
          }}
        >
          <span
            className={`${playfair.className} text-[22px] tracking-[-0.01em]`}
            style={{ color: C.navy }}
          >
            Velosta
          </span>
          <span
            className="hidden h-3 w-px sm:block"
            style={{ backgroundColor: "rgba(11,31,42,0.25)" }}
          />
          <span
            className="hidden text-[10px] font-medium uppercase tracking-[0.32em] sm:inline"
            style={{ color: C.teal }}
          >
            AI Planner
          </span>
        </Link>
      </motion.div>

      {/* Step rail intentionally removed for a cleaner crafting experience. */}
    </>
  );
}
