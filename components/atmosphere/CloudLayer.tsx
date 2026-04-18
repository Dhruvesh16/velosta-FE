"use client";

/**
 * CloudLayer
 * ──────────────────────────────────────────────
 * Three soft radial clouds drifting across the sky band at
 * different depths/speeds. Opacity 0.12–0.22 — always subtle.
 */

import { motion, useReducedMotion } from "framer-motion";

type Cloud = {
  /** vertical position (% from top of sky band) */
  top: number;
  /** cloud width in px */
  width: number;
  /** drift duration in seconds */
  duration: number;
  /** animation offset (-delay) in seconds */
  delay: number;
  /** opacity 0–1 */
  opacity: number;
};

const CLOUDS: Cloud[] = [
  { top: 12, width: 520, duration: 110, delay: 0, opacity: 0.22 },
  { top: 38, width: 380, duration: 145, delay: -40, opacity: 0.14 },
  { top: 58, width: 620, duration: 170, delay: -90, opacity: 0.18 },
];

type Props = {
  /** Height of the sky band (where clouds drift) in % */
  skyHeight?: number;
  className?: string;
};

export default function CloudLayer({ skyHeight = 62, className = "" }: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 top-0 overflow-hidden ${className}`}
      style={{ height: `${skyHeight}%` }}
    >
      {CLOUDS.map((cloud, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            top: `${cloud.top}%`,
            width: cloud.width,
            height: cloud.width * 0.32,
            // Soft radial cloud — no hard edge
            background: `radial-gradient(ellipse at center,
              rgba(245,239,230,${cloud.opacity}) 0%,
              rgba(245,239,230,${cloud.opacity * 0.55}) 35%,
              rgba(245,239,230,0) 70%)`,
            filter: "blur(2px)",
            willChange: "transform",
          }}
          initial={{ x: "-30%" }}
          animate={reduce ? undefined : { x: ["-30%", "130%"] }}
          transition={{
            duration: cloud.duration,
            delay: cloud.delay,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
}
