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
  sand: "#F5EFE6",
  teal: "#2F6F73",
  tealLight: "#3A8589",
  mist: "#D9E2E1",
};

export type FlowStep =
  | "landing"
  | "budget"
  | "packages"
  | "trip-inputs"
  | "explore"
  | "planner";

const STEPS: { id: FlowStep; label: string; short: string }[] = [
  { id: "landing", label: "Begin", short: "01" },
  { id: "budget", label: "Intent", short: "02" },
  { id: "packages", label: "Discover", short: "03" },
  { id: "explore", label: "Explore", short: "04" },
  { id: "trip-inputs", label: "Shape", short: "05" },
  { id: "planner", label: "Journey", short: "06" },
];

type Props = {
  currentStep: FlowStep;
  onExit?: () => void;
};

export default function FlowChrome({ currentStep, onExit }: Props) {
  const reduced = useReducedMotion();
  const currentIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = currentIndex >= 0 ? (currentIndex / (STEPS.length - 1)) * 100 : 0;

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

      {/* Step rail — bottom-center, hides on small screens */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
        className="pointer-events-none fixed inset-x-0 bottom-6 z-40 hidden justify-center md:flex"
      >
        <div
          className="pointer-events-auto relative flex items-center gap-5 rounded-full px-6 py-3"
          style={{
            background: "rgba(245,239,230,0.72)",
            backdropFilter: "blur(18px) saturate(140%)",
            WebkitBackdropFilter: "blur(18px) saturate(140%)",
            border: "1px solid rgba(11,31,42,0.08)",
            boxShadow:
              "0 10px 30px -10px rgba(11,31,42,0.12), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          {/* Progress track */}
          <div
            aria-hidden
            className="absolute left-6 right-6 top-1/2 h-px -translate-y-1/2"
            style={{ backgroundColor: "rgba(11,31,42,0.08)" }}
          />
          <motion.div
            aria-hidden
            initial={false}
            animate={{ width: `calc((100% - 3rem) * ${progress / 100})` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-6 top-1/2 h-px -translate-y-1/2"
            style={{ backgroundColor: C.teal, opacity: 0.55 }}
          />

          {STEPS.map((step, i) => {
            const isActive = step.id === currentStep;
            const isPast = i < currentIndex;
            return (
              <div
                key={step.id}
                className="relative z-10 flex items-center gap-2"
              >
                <motion.span
                  animate={{
                    scale: isActive ? 1.15 : 1,
                    backgroundColor: isActive
                      ? "rgba(47,111,115,1)"
                      : isPast
                      ? "rgba(47,111,115,1)"
                      : "rgba(47,111,115,0)",
                    borderColor: isActive || isPast ? C.teal : "rgba(11,31,42,0.25)",
                  }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="block h-2 w-2 rounded-full border"
                  style={{ borderWidth: "1.5px" }}
                />
                <motion.span
                  animate={{
                    color: isActive
                      ? C.navy
                      : isPast
                      ? "rgba(11,31,42,0.55)"
                      : "rgba(11,31,42,0.35)",
                    fontWeight: isActive ? 500 : 400,
                  }}
                  transition={{ duration: 0.4 }}
                  className="text-[10px] uppercase tracking-[0.22em]"
                >
                  {step.label}
                </motion.span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Mobile — compact step indicator. Hidden on the planner step because
          SpatialPlannerShell renders its own bottom tab bar there. */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.5 }}
        className={`pointer-events-none fixed bottom-4 left-1/2 z-40 -translate-x-1/2 md:hidden ${
          currentStep === "planner" || currentStep === "budget" ? "hidden" : ""
        }`}
      >
        <div
          className="flex items-center gap-3 rounded-full px-4 py-2"
          style={{
            background: "rgba(245,239,230,0.88)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(11,31,42,0.08)",
          }}
        >
          <span
            className={`${playfair.className} text-[13px] italic`}
            style={{ color: C.teal }}
          >
            {STEPS[currentIndex]?.short ?? "01"}
          </span>
          <span
            className="text-[10px] font-medium uppercase tracking-[0.2em]"
            style={{ color: C.navy }}
          >
            {STEPS[currentIndex]?.label ?? "Begin"}
          </span>
          <span
            className="text-[10px]"
            style={{ color: "rgba(11,31,42,0.35)" }}
          >
            of {STEPS.length}
          </span>
        </div>
      </motion.div>
    </>
  );
}
