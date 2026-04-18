"use client";

/**
 * OceanLayer
 * ──────────────────────────────────────────────
 * Horizon band with two very slow CSS wave strata.
 * Pure SVG + CSS transforms — zero GPU cost.
 *
 * Sits at the *bottom* of the section, behind clouds and bird.
 */

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  /** Height of ocean band as a % of section height */
  height?: number;
  /** Color of water (navy / teal blend) */
  color?: string;
  className?: string;
};

export default function OceanLayer({
  height = 38,
  color = "#0B1F2A",
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden ${className}`}
      style={{ height: `${height}%` }}
    >
      {/* Water body — gradient from horizon haze to deeper tone */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg,
            rgba(217,226,225,0) 0%,
            rgba(47,111,115,0.12) 22%,
            rgba(47,111,115,0.22) 55%,
            ${color}33 100%)`,
        }}
      />

      {/* Far wave — broad, slow, muted */}
      <motion.svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[42%] h-[70px] w-[200%]"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 60, ease: "linear", repeat: Infinity }}
      >
        <path
          d="M0,80 C240,40 480,120 720,80 C960,40 1200,120 1440,80 L1440,160 L0,160 Z"
          fill={color}
          opacity="0.18"
        />
      </motion.svg>

      {/* Near wave — crisper, contrasts against far */}
      <motion.svg
        viewBox="0 0 1440 160"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 h-[120px] w-[200%]"
        animate={reduce ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 90, ease: "linear", repeat: Infinity }}
      >
        <path
          d="M0,90 C200,60 400,130 720,100 C1040,70 1240,140 1440,100 L1440,160 L0,160 Z"
          fill={color}
          opacity="0.38"
        />
      </motion.svg>

      {/* Specular glint — very subtle horizontal highlight */}
      <div
        className="absolute inset-x-0"
        style={{
          top: "30%",
          height: "1px",
          background:
            "linear-gradient(90deg, transparent 0%, rgba(245,239,230,0.35) 50%, transparent 100%)",
          opacity: 0.55,
        }}
      />
    </div>
  );
}
