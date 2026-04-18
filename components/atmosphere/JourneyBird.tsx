"use client";

/**
 * JourneyBird
 * ──────────────────────────────────────────────
 * A single elegant bird silhouette gliding left → right with a gentle
 * upward drift. Wings beat slowly (12s cycle) so movement feels
 * cinematic rather than animated.
 *
 * Designed to sit *above* the horizon band.
 */

import { motion, useReducedMotion } from "framer-motion";

type Props = {
  /** Silhouette color (usually navy with alpha) */
  color?: string;
  /** Base opacity 0–1 */
  opacity?: number;
  /** Glide cycle duration in seconds */
  duration?: number;
  /** Starting delay in seconds */
  delay?: number;
  /** Vertical band anchor: % of container height where the bird drifts from */
  startTop?: number;
  /** Vertical rise (px) across the journey — subtle */
  rise?: number;
  /** Scale of the glyph */
  scale?: number;
  className?: string;
};

export default function JourneyBird({
  color = "rgba(11,31,42,0.55)",
  opacity = 0.55,
  duration = 44,
  delay = 0,
  startTop = 44,
  rise = 42,
  scale = 1,
  className = "",
}: Props) {
  const reduce = useReducedMotion();

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <motion.div
        className="absolute"
        style={{
          top: `${startTop}%`,
          left: 0,
          willChange: "transform",
          filter: "blur(0.3px)",
        }}
        initial={{ x: "-8%", y: 0, opacity: 0 }}
        animate={
          reduce
            ? { opacity }
            : {
                x: ["-8%", "110%"],
                y: [0, -rise * 0.6, -rise],
                opacity: [0, opacity, opacity, opacity * 0.6, 0],
              }
        }
        transition={{
          duration,
          delay,
          times: [0, 0.18, 0.6, 0.85, 1],
          ease: "linear",
          repeat: Infinity,
          repeatDelay: 6,
        }}
      >
        {/* Wing-beat on inner element — very slow, so it reads as a glide */}
        <motion.svg
          width={44 * scale}
          height={16 * scale}
          viewBox="0 0 44 16"
          style={{ display: "block" }}
          animate={reduce ? undefined : { scaleY: [1, 0.55, 1, 0.7, 1] }}
          transition={{
            duration: 12,
            ease: "easeInOut",
            repeat: Infinity,
          }}
        >
          {/* Gentle M-curve silhouette — two arcs meeting at body */}
          <path
            d="M1 8 C 8 1, 14 1, 22 7.5 C 30 1, 36 1, 43 8"
            fill="none"
            stroke={color}
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      </motion.div>
    </div>
  );
}
